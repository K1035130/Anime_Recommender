"""英文界面的出入站翻译：POST /api/translate + llm.translate()（2026-10-11）。

⚠️ 与 test_llm.py 同一条纪律：全部 monkeypatch 掉网络层，不打真实 API。
   测的是「端点的准入 / 长度上限 / 失败语义」与「prompt 按方向选对、
   输出清洗」，**不是翻译质量** —— 那要人读。

要锁住的几条设计约束：
  · 未登录 401（会调 LLM 的端点都要账号，与 _require_user 的判据一致）
  · 两个方向的长度上限不同（zh 500 / en 4000），这是防滥用的唯一闸门
  · 翻译失败是 503，**绝不能 200 + 原文冒充译文**
  · 翻译 prompt **不进** prompt_digest() —— 否则 /api/ask 的基线指纹会无谓地变
"""

import pytest
from fastapi.testclient import TestClient

from server import schemas
from server.main import API, app
from src import llm

URL = f"{API}/translate"


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def _fake_translate(calls: list):
    def fake(text, target):
        calls.append((text, target))
        return f"[{target}]{text}", llm.TRANSLATE_PROVIDER
    return fake


# ============================================================
# 端点
# ============================================================

@pytest.mark.real_auth
def test_requires_login(client):
    client.cookies.clear()
    r = client.post(URL, json={"text": "Who is Mikasa?", "target": "zh"})
    assert r.status_code == 401


def test_to_zh_ok(client, monkeypatch):
    calls: list = []
    monkeypatch.setattr(llm, "translate", _fake_translate(calls))
    r = client.post(URL, json={"text": "Who is Mikasa?", "target": "zh"})
    assert r.status_code == 200
    assert r.json() == {"text": "[zh]Who is Mikasa?", "target": "zh"}
    assert calls == [("Who is Mikasa?", "zh")]


def test_zh_direction_has_tighter_cap(client, monkeypatch):
    """同样 501 字符：译成中文（问句方向）拒绝，译成英文（回答方向）放行。"""
    monkeypatch.setattr(llm, "translate", _fake_translate([]))
    long = "a" * (schemas.TRANSLATE_MAX_TO_ZH + 1)
    assert client.post(URL, json={"text": long, "target": "zh"}).status_code == 422
    assert client.post(URL, json={"text": long, "target": "en"}).status_code == 200


def test_en_direction_cap(client, monkeypatch):
    monkeypatch.setattr(llm, "translate", _fake_translate([]))
    long = "字" * (schemas.TRANSLATE_MAX_TO_EN + 1)
    assert client.post(URL, json={"text": long, "target": "en"}).status_code == 422


@pytest.mark.parametrize("body", [
    {"text": "", "target": "zh"},
    {"text": "hi", "target": "ja"},
    {"text": "hi"},
])
def test_bad_request(client, monkeypatch, body):
    monkeypatch.setattr(llm, "translate", _fake_translate([]))
    assert client.post(URL, json=body).status_code == 422


def test_llm_failure_is_503_not_passthrough(client, monkeypatch):
    def boom(text, target):
        raise llm.LLMError("挂了")
    monkeypatch.setattr(llm, "translate", boom)
    r = client.post(URL, json={"text": "Who is Mikasa?", "target": "zh"})
    assert r.status_code == 503
    assert "Who is Mikasa?" not in r.text


# ============================================================
# llm.translate()
# ============================================================

def _capture_post(reply: str, seen: list):
    def fake(p, messages, max_tokens):
        seen.append((p, messages, max_tokens))
        return reply
    return fake


@pytest.mark.parametrize("target, system, max_tokens", [
    ("zh", llm.TRANSLATE_TO_ZH_SYSTEM, llm.MAX_TOKENS_TRANSLATE_ZH),
    ("en", llm.TRANSLATE_TO_EN_SYSTEM, llm.MAX_TOKENS_TRANSLATE_EN),
])
def test_prompt_and_provider_by_direction(monkeypatch, target, system, max_tokens):
    seen: list = []
    monkeypatch.setattr(llm, "_post_with_retry", _capture_post("译文", seen))
    out, p = llm.translate("原文", target)
    assert out == "译文"
    assert p is llm.TRANSLATE_PROVIDER
    (prov, messages, mt), = seen
    assert prov is llm.TRANSLATE_PROVIDER
    assert messages[0] == {"role": "system", "content": system}
    assert messages[1] == {"role": "user", "content": "原文"}
    assert mt == max_tokens


def test_strips_think_shell(monkeypatch):
    monkeypatch.setattr(llm, "_post_with_retry",
                        _capture_post("<think>\n\n</think>\n三笠是谁？", []))
    assert llm.translate("Who is Mikasa?", "zh")[0] == "三笠是谁？"


def test_empty_after_strip_raises(monkeypatch):
    monkeypatch.setattr(llm, "_post_with_retry",
                        _capture_post("<think>只有思考</think>", []))
    with pytest.raises(llm.LLMError):
        llm.translate("hi", "zh")


def test_bad_target_raises():
    with pytest.raises(ValueError):
        llm.translate("hi", "ja")


def test_translate_prompts_not_in_digest(monkeypatch):
    """翻译在 /api/ask 之外发生，不该改动 /api/ask 的配置指纹。"""
    before = llm.prompt_digest()
    monkeypatch.setattr(llm, "TRANSLATE_TO_ZH_SYSTEM", "changed")
    monkeypatch.setattr(llm, "TRANSLATE_TO_EN_SYSTEM", "changed")
    assert llm.prompt_digest() == before
