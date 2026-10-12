# 英文界面翻译抽样审核表

> 2026-10-11，英文界面刚做完时的第一轮人工检查。**14 题，全部真实调用**
> `POST /api/translate`（en→zh）→ `POST /api/ask` → `POST /api/translate`（zh→en），
> 与前端 AskPanel 的三步完全一致，不是编的。
> 翻译模型 `deepseek-ai/DeepSeek-V3`；问答链路未改动。

> **两问打分规则**：
>
> **`in:`** —— 英文问句译成的中文，**意思对不对**？
>   `y` = 意思没走样，作品/角色/人名保留原文或译对了 / `n` = 有问题，`note:` 写一句
>   ⚠️ 专有名词**保留英文是设计如此**（实测比翻成中文更容易被系统认出），不算错。
>   要扣分的是：意思变了、限定条件丢了（季数、「最近」）、专有名词被**译错**。
>
> **`out:`** —— 中文回答译回的英文，**忠实吗**？
>   `y` = 信息没增没减、人名片名对 / `n` = 有问题，`note:` 写一句
>   常见的 `n`：人名/片名译错（最危险，英文用户看不到原文）、漏句、
>   把「资料中没有提到」这类保留语气译没了。
>   回答没被翻译（season/find 展示的是结构化列表）就填 `-`。
>
> 「系统认出」那行只是给你参考的上下文，不用打分。

---

## [1] What is the story of Haibane Renmei?

**考什么**：冷门作品名 —— 首版 prompt 把它译成了《海坊主》

**中文译文**：《Haibane Renmei》的故事是什么？

**系统认出**：`route=ask` `state=ok` 作品《灰羽联盟》

**耗时**：入站 2.2s · 问答 15.7s · 回译 14.6s

**中文原回答**：

```
《Haibane Renmei》的故事围绕一群被称为“灰羽”（Haibane）的特殊存在展开。这些灰羽生活在一座名为“老房子”（Old House）的封闭社区中，她们的翅膀颜色和斑点象征着某种“罪”或过去的记忆。故事主要聚焦于两位角色：砾（Guri）和落下（Rakka）。

砾是第二女主角，成为灰羽七年，是老房子里第二年长的成员，也是照顾其他灰羽最多的人。她记得的梦境不完整，只记得在梦中一个人走在月光下的石子道路上。砾试图通过作画来重现这个梦境，但最终画出的却是她内心的噩梦。砾出生时的翅膀带有黑色斑点，这使她被视为“不被祝福的灰羽”，受到其他灰羽的排斥，性格因此变得灰暗内向。然而，在暗森（Kuro）的帮助下，她逐渐赢得了大家的信任，也成为了落下唯一能依靠的朋友。

落下是本作的主角，她成为灰羽两年，因梦到在空中漂浮而被命名为“空”（Sora）。但由于她的梦境与另一位灰羽类似，而“空”这个名字已被使用，她最终被命名为“落下”。落下在动画中是一个活泼外向、天真无邪的女孩，但她的外表看起来很像男孩子，甚至穿男装。她是第一个在空出生后离巢的灰羽，空的突然离巢对落下造成了极大的打击，使她极度悲伤，甚至因此翅膀上长出了黑色斑点，进入了“带罪状态”。

资料中没有说明故事的完整走向或结局，但已知剧情推进到：砾和落下之间的关系、落下因空的离巢而产生的心理变化，以及砾试图通过绘画理解自己梦境的过程。
```

**英文回译**：

```
The story of Haibane Renmei revolves around a group of special beings called "Haibane" who live in a secluded community known as the "Old House." The color and spots on their wings symbolize certain "sins" or past memories. The narrative primarily focuses on two characters: Guri and Rakka.  

Guri is the secondary protagonist, having been a Haibane for seven years, making her the second oldest member of the Old House and the one who takes care of the other Haibane the most. Her dream memories are fragmented—she only recalls walking alone on a moonlit gravel path in her dream. She attempts to recreate this dream through painting, but what she ultimately paints is the nightmare within her heart. Guri's wings bore black spots at birth, marking her as an "unblessed Haibane," which led to her being ostracized by the others, causing her personality to become gloomy and introverted. However, with the help of Kuro, she gradually earns the trust of the others and becomes the only friend Rakka can rely on.  

Rakka is the main protagonist of the series, having been a Haibane for two years. She was initially named "Sora" (meaning "sky") because she dreamed of floating in the air. However, since her dream resembled another Haibane's and the name "Sora" was already taken, she was ultimately named "Rakka" (meaning "falling"). In the anime, Rakka is a lively, outgoing, and innocent girl, though her appearance is quite boyish—she even wears boys' clothing. She is the first Haibane to leave the nest after Sora's birth, and Sora's sudden departure deeply affects Rakka, plunging her into extreme sorrow. This emotional turmoil causes black spots to appear on her wings, marking her as entering a "sin-bound state."  

The sources do not mention the complete progression or conclusion of the story, but it is known that the plot develops around: the relationship between Guri and Rakka, Rakka's psychological changes following Sora's departure, and Guri's attempts to understand her dreams through painting.
```

```
in:
out:
note:
```

---

## [2] Who is Ainz Ooal Gown?

**考什么**：角色名保留原文

**中文译文**：Ainz Ooal Gown是谁？

**系统认出**：`route=ask` `state=ok` 作品《OVERLORD》

**耗时**：入站 1.5s · 问答 10.0s · 回译 8.5s

**中文原回答**：

```
安兹·乌尔·恭（Ainz Ooal Gown）是纳萨里克地下大坟墓的至高无上的四十一位至尊，原本是网络游戏玩家，所属公会为“安兹·乌尔·恭”。在游戏「YGGDRASIL」关闭运营的最后，他意外穿越至异世界，成为本书的主人公。他的真实身份是一名喜欢电玩的普通青年，元角色名音译为“莫莫伽”。在第一卷中，他将自己的名字改为安兹·乌尔·恭，作为纳萨里克的象征及核心。

资料中提到，他是“安兹·乌尔·恭”早期成员，四十一位普通女仆的三名制作者之一（另外两人为白色发饰和古·托古·古拉斯）。他还持有十一个世界级道具，包括“复活魔杖”和“无限背包”，并使用“安兹乌尔恭之杖”作为公会武器。

AI 检索可能有遗漏，如果需要更详细的资料可以查阅以下条目：[黑洛黑洛](https://zh.moegirl.org.cn/%E9%BB%91%E6%B4%9B%E9%BB%91%E6%B4%9B)
```

**英文回译**：

```
Ainz Ooal Gown is one of the Supreme Forty-One Overlords of the Great Tomb of Nazarick. Originally a player in the online game YGGDRASIL, he belonged to the guild "Ainz Ooal Gown." At the moment the game shut down, he was unexpectedly transported to another world, becoming the protagonist of the story. His true identity is that of an ordinary young man who loved video games, and his original character name was romanized as "Momonga." In Volume 1, he changed his name to Ainz Ooal Gown, symbolizing his role as the heart and core of Nazarick.

According to available sources, he was an early member of "Ainz Ooal Gown" and one of the three creators of the Forty-One Homunculus Maids (the other two being White Hair Ornament and Guren Togugu). He also possesses eleven World-Class Items, including the "Staff of Resurrection" and "Bottomless Bag," and wields the "Staff of Ainz Ooal Gown" as the guild weapon.

AI search results may be incomplete. For more detailed information, you can refer to the following entry: [Herohero](https://zh.moegirl.org.cn/%E9%BB%91%E6%B4%9B%E9%BB%91%E6%B4%9B)
```

```
in:
out:
note:
```

---

## [3] How does Steins;Gate end?

**考什么**：结局题 + 带标点的片名

**中文译文**：《Steins;Gate》的结局是怎样的？

**系统认出**：`route=ask` `state=ok` 作品《命运石之门》

**耗时**：入站 1.2s · 问答 24.3s · 回译 7.0s

**中文原回答**：

```
资料里没有写到《Steins;Gate》的结局。已知剧情推进到：在Steins;Gate线中，绹正常长大成人，成为JAXA的新人研究员，拥有自行车“やいんげん号”，擅长格斗游戏和格斗技，秘密身份是反抗“三百人委员会”的组织成员，代号“S·布拉温”。

AI 检索可能有遗漏，如果需要更详细的资料可以查阅以下条目：[命运石之门系列](https://zh.moegirl.org.cn/%E5%91%BD%E8%BF%90%E7%9F%B3%E4%B9%8B%E9%97%A8%E7%B3%BB%E5%88%97) · [天王寺绹](https://zh.moegirl.org.cn/%E5%A4%A9%E7%8E%8B%E5%AF%BA%E7%BB%B9)
```

**英文回译**：

```
The sources do not mention the ending of Steins;Gate. The known plot progression is: In the Steins;Gate worldline, Towa grows up normally, becomes a rookie researcher at JAXA, owns a bicycle named "Yain'gen," excels at fighting games and martial arts, and has a secret identity as a member of an organization opposing the "Committee of 300," with the codename "S. Brawn."

AI search may have omissions. If more detailed information is needed, you can refer to the following entries: [Steins;Gate Series](https://zh.moegirl.org.cn/%E5%91%BD%E8%BF%90%E7%9F%B3%E4%B9%8B%E9%97%A8%E7%B3%BB%E5%88%97) · [Tennouji Towa](https://zh.moegirl.org.cn/%E5%A4%A9%E7%8E%8B%E5%AF%BA%E7%BB%B9)
```

```
in:
out:
note:
```

---

## [4] What's the relationship between Mikasa and Eren in Attack on Titan?

**考什么**：关系题，两个角色名 + 英文官方片名

**中文译文**：《Attack on Titan》中Mikasa和Eren是什么关系？

**系统认出**：`route=ask` `state=ok` 作品《进击的巨人》

**耗时**：入站 1.3s · 问答 6.3s · 回译 4.4s

**中文原回答**：

```
艾连（Eren）与米卡莎（Mikasa）是儿时玩伴。资料中提到，阿明·阿诺德是艾连与米卡莎的儿时玩伴，但未明确说明艾连与米卡莎之间的具体关系，除了他们共同的童年经历。

AI 检索可能有遗漏，如果需要更详细的资料可以查阅以下条目：[进击的巨人](https://zh.moegirl.org.cn/%E8%BF%9B%E5%87%BB%E7%9A%84%E5%B7%A8%E4%BA%BA)
```

**英文回译**：

```
Eren and Mikasa were childhood friends. The sources mention that Armin Arlert was a childhood friend of Eren and Mikasa, but do not explicitly state the specific relationship between Eren and Mikasa beyond their shared childhood experiences.

AI search may have omissions. For more detailed information, you can refer to the following entry: [Attack on Titan](https://zh.moegirl.org.cn/%E8%BF%9B%E5%87%BB%E7%9A%84%E5%B7%A8%E4%BA%BA)
```

```
in:
out:
note:
```

---

## [5] What's the opening song of Bocchi the Rock?

**考什么**：OP 题（songs 席位）

**中文译文**：《Bocchi the Rock》的开场曲是什么？

**系统认出**：`route=ask` `state=ok` 作品《孤独摇滚！》

**耗时**：入站 1.8s · 问答 5.0s · 回译 4.1s

**中文原回答**：

```
资料中没有提到《Bocchi the Rock》的开场曲是什么。

AI 检索可能有遗漏，如果需要更详细的资料可以查阅以下条目：[孤独摇滚！](https://zh.moegirl.org.cn/%E5%AD%A4%E7%8B%AC%E6%91%87%E6%BB%9A%EF%BC%81)
```

**英文回译**：

```
The sources do not mention what the opening theme song of Bocchi the Rock is.

AI search may have omissions. If you need more detailed information, you can check the following entry: [Bocchi the Rock!](https://zh.moegirl.org.cn/%E5%AD%A4%E7%8B%AC%E6%91%87%E6%BB%9A%EF%BC%81)
```

```
in:
out:
note:
```

---

## [6] When did Gunslinger Girl first air?

**考什么**：播出时间

**中文译文**：《Gunslinger Girl》的首播时间是什么时候？

**系统认出**：`route=ask` `state=ok` 作品《神枪少女》

**耗时**：入站 1.2s · 问答 4.9s · 回译 3.5s

**中文原回答**：

```
《Gunslinger Girl》动画第1期的首播时间是**2003年10月8日**。这一信息来源于资料中对动画版的介绍。

AI 检索可能有遗漏，如果需要更详细的资料可以查阅以下条目：[神枪少女](https://zh.moegirl.org.cn/%E7%A5%9E%E6%9E%AA%E5%B0%91%E5%A5%B3)
```

**英文回译**：

```
The first season of Gunslinger Girl premiered on **October 8, 2003**. This information comes from the anime's profile in the sources.  

AI search may have omissions. For more detailed information, you can refer to this entry: [神枪少女](https://zh.moegirl.org.cn/%E7%A5%9E%E6%9E%AA%E5%B0%91%E5%A5%B3).
```

```
in:
out:
note:
```

---

## [7] Which characters has Hanazawa Kana voiced recently?

**考什么**：声优，日式语序（库里只认这个）

**中文译文**：Hanazawa Kana 最近为哪些角色配过音？

**系统认出**：`route=voice` `state=ok`

**耗时**：入站 1.6s · 问答 10.6s · 回译 5.2s

**中文原回答**：

```
Hanazawa Kana 最近为《Fate/strange Fake》的绫香·沙条、《关于虽然逃走的鱼很大、但钓上来的鱼却太大了这件事》的未记录角色、《异国日记》的未记录角色、《上伊那牡丹，酒醉身姿似百合花般》的未记录角色、《魔都精兵的奴隶 第二季》的未记录角色、《午夜的倾心旋律》的安藤柠檬、《身为魔族的我想向勇者小队的可爱女孩告白。》的赛西莉亚、《当前、正被打扰中！》的仲间凛子等角色配过音，均出自2026年播出的作品。
```

**英文回译**：

```
Hanazawa Kana recently voiced Ayaka Sajo in Fate/strange Fake, an uncredited role in Though the Escaped Fish Was Big, the One I Caught Was Even Bigger, an uncredited role in Diary of a Foreign Country, an uncredited role in The Drunken Peony of Kamiina, an uncredited role in Slave of the Magic Capital's Elite Troops Season 2, Andou Lemon in Midnight Heartbeat Melody, Cecilia in As a Demon, I Want to Confess to the Cute Girl in the Hero's Party, and Nakama Rinko in Currently Being Disturbed!, all from works airing in 2026.
```

```
in:
out:
note:
```

---

## [8] Which roles has Rie Kugimiya voiced?

**考什么**：声优，英文语序 —— 已知弱点，模型不一定调语序

**中文译文**：Rie Kugimiya 配音过哪些角色？

**系统认出**：`route=ask` `state=unknown`

**耗时**：入站 1.6s · 问答 1.2s · 回译 2.0s

**中文原回答**：

```
没有找到这个名字的声优。没认出你问的是哪部作品或哪个角色。
```

**英文回译**：

```
No voice actor by that name was found. Could not identify which anime or character you're referring to.
```

```
in:
out:
note:
```

---

## [9] What anime was airing this season ten years ago?

**考什么**：档期（season 分支，零模型）

**中文译文**：十年前的这个季度正在播放什么动画？

**系统认出**：`route=season` `state=ok`；档期列表 2016-10 共 138 部（结构化展示，answer 不翻译）

**耗时**：入站 1.9s · 问答 1.7s · 回译 0.0s

**中文原回答**：

```
2016 年 10 月番共 138 部，按热度列出前 24 部：
吹响吧！上低音号 第二季（2016-10-05）
3月的狮子（2016-10-08）
我的青春恋爱物语果然有问题 续 OVA（2016-10-27）
排球少年 乌野高校 VS 白鸟泽学园高校（2016-10-07）
Fate/Grand Order -First Order-（2016-12-31）
少女编号（2016-10-06）
超自然9人组（2016-10-08）
夏目友人帐 伍（2016-10-04）
文豪野犬 第二季（2016-10-05）
星期一的丰满（2016-10-10）
亚人 第2部分（2016-10-07）
轻拍翻转小魔女（2016-10-06）
冰上的尤里（2016-10-05）
弹丸论破3 -The End of 希望之峰学园- 希望篇（2016-09-29）
WWW.迷糊餐厅（2016-10-01）
凸变英雄（2016-10-04）
噬血狂袭 II（2016-11-23）
终末的伊泽塔（2016-10-01）
我老婆是学生会长!+!（2016-10-02）
编舟记（2016-10-13）
在地下城寻求邂逅是否搞错了什么 OVA（2016-12-07）
魔法少女育成计划（2016-10-01）
我太受欢迎了该怎么办（2016-10-06）
机动战士高达 铁血的奥尔芬斯 第二季（2016-10-02）
```

**英文回译**：

（未翻译）

```
in:
out:
note:
```

---

## [10] Any anime where the protagonist is overpowered but keeps a low profile?

**考什么**：描述找番（find 分支）

**中文译文**：有没有主角实力超强但保持低调的动画？

**系统认出**：`route=find` `state=ok`；找番列表：想要成为影之实力者！、心跳心跳！迷你迷你！隐藏地下城剧场、我家有个阿宅女忍者、常轨脱离Creative、灵能百分百 …（结构化展示，answer 不翻译）

**耗时**：入站 1.9s · 问答 4.2s · 回译 0.0s

**中文原回答**：

```
没有认出你问的是哪部具体作品，语义上比较接近的番（仅供参考，不保证真的是你要找的）：
想要成为影之实力者！（2022）
心跳心跳！迷你迷你！隐藏地下城剧场（2021）
我家有个阿宅女忍者（2025）
常轨脱离Creative（2024）
灵能百分百（2016）
你所期望的永远（2003）
森田同学很沉默（2011）
最终幻想：无限（2001）
```

**英文回译**：

（未翻译）

```
in:
out:
note:
```

---

## [11] In Frieren, why does Frieren want to understand humans?

**考什么**：动机题，作品名与角色名同形

**中文译文**：在《Frieren》中，为什么Frieren想要理解人类？

**系统认出**：`route=ask` `state=ok` 作品《葬送的芙莉莲》

**耗时**：入站 1.9s · 问答 9.0s · 回译 8.3s

**中文原回答**：

```
芙莉莲想要理解人类，是因为她意识到自己过去对魔族的仇恨可能是一种错误，并希望在生命的余下时间里弥补这一认知。从资料看，她曾因魔族杀害了她的族人而痛恨魔族，但在经历与辛美尔等人的冒险后，她开始思考自己是否应该更深入了解人类，这一想法也得到了辛美尔的认可和支持。

资料中提到，芙莉莲在与一位人类女性的对话中，得知对方因希望魔王被打败而守护村子，这让她对自己的动机产生反思。同时，她在辛美尔去世后，也因与辛美尔的相遇和共同经历，开始准备踏上“理解人类”的旅程。此外，她还提到自己也像那位人类女性一样，是因为珍贵的回忆而想要了解人类。

AI 检索可能有遗漏，如果需要更详细的资料可以查阅以下条目：[芙莉莲](https://zh.moegirl.org.cn/%E8%8A%99%E8%8E%89%E8%8E%B2) · [佛鲁爷爷](https://zh.moegirl.org.cn/%E4%BD%9B%E9%B2%81%E7%88%B7%E7%88%B7)
```

**英文回译**：

```
Frieren wants to understand humans because she realizes her past hatred for demons might have been a mistake, and she hopes to make up for this realization in the remaining time of her life. According to available sources, she once hated demons for slaughtering her people, but after her adventures with Himmel and others, she began to question whether she should seek a deeper understanding of humans—an idea that also received Himmel's approval and support.

The sources mention that during a conversation with a human woman, Frieren learned the woman protected her village in hopes of the demon king's defeat, which prompted Frieren to reflect on her own motivations. After Himmel's death, she also began preparing for a journey to "understand humans" due to her encounters and shared experiences with him. Additionally, she mentioned that, like that human woman, she too wished to understand humans because of precious memories.

AI search may have omissions. For more detailed information, you can refer to the following entries: [Frieren](https://zh.moegirl.org.cn/%E8%8A%99%E8%8E%89%E8%8E%B2) · [Old Man Voll](https://zh.moegirl.org.cn/%E4%BD%9B%E9%B2%81%E7%88%B7%E7%88%B7)
```

```
in:
out:
note:
```

---

## [12] What happens to Rem in Re:Zero season 2?

**考什么**：季数限定 + 可能涉及剧透

**中文译文**：Rem在《Re:Zero》第二季中发生了什么？

**系统认出**：`route=ask` `state=ok` 作品《Re：从零开始的异世界生活》

**耗时**：入站 1.5s · 问答 8.9s · 回译 13.9s

**中文原回答**：

```
在《Re:Zero》第二季中，蕾姆遭遇了暴食司教莱伊·巴登凯托斯的袭击。在与库珥修一同返回王城的途中，蕾姆被莱伊袭击，最终在中了暴食司教的权能后**昏迷不醒，并失去存在**。这一事件促使昴为了救回蕾姆，将断剑插入自己的喉咙，试图通过存档点重来改变结局，但未能成功。

资料中没有提到蕾姆在第二季后续剧情中的具体恢复情况或是否再次出现。已知剧情推进到：昴在自责中被帕克告知关于“暴食”的事情，并被托付了莉雅，随后遇见了失去记忆的库珥修，双方阵营召开会议讨论未来的行动。

AI 检索可能有遗漏，如果需要更详细的资料可以查阅以下条目：[菜月昴](https://zh.moegirl.org.cn/%E8%8F%9C%E6%9C%88%E6%98%B4) · [加斯顿](https://zh.moegirl.org.cn/%E5%8A%A0%E6%96%AF%E9%A1%BF) · [莱伊·巴登凯托斯](https://zh.moegirl.org.cn/%E8%8E%B1%E4%BC%8A%C2%B7%E5%B7%B4%E7%99%BB%E5%87%AF%E6%89%98%E6%96%AF) · [雷姆(Re:从零开始的异世界生活)](https://zh.moegirl.org.cn/%E9%9B%B7%E5%A7%86%28Re%3A%E4%BB%8E%E9%9B%B6%E5%BC%80%E5%A7%8B%E7%9A%84%E5%BC%82%E4%B8%96%E7%95%8C%E7%94%9F%E6%B4%BB%29)
```

**英文回译**：

```
In the second season of Re:Zero, Rem was attacked by the Archbishop of Gluttony, Ley Batenkaitos. While returning to the royal capital with Crusch, Rem was assaulted by Ley and ultimately **fell into a coma and lost her existence** after being affected by the Archbishop of Gluttony's authority. This event prompted Subaru to stab his own throat with a broken sword in an attempt to reset the outcome by returning to a save point, but he failed to succeed.

The sources do not mention Rem's specific recovery or whether she reappears in the later parts of the second season. The known plot progresses as follows: Subaru, consumed by guilt, is informed by Puck about the nature of "Gluttony" and entrusted with Lia. He then encounters Crusch, who has lost her memory, and the two factions hold a meeting to discuss future actions.

AI search may have omissions. For more detailed information, you can refer to the following entries: [Natsuki Subaru](https://zh.moegirl.org.cn/%E8%8F%9C%E6%9C%88%E6%98%B4) · [Gaston](https://zh.moegirl.org.cn/%E5%8A%A0%E6%96%AF%E9%A1%BF) · [Ley Batenkaitos](https://zh.moegirl.org.cn/%E8%8E%B1%E4%BC%8A%C2%B7%E5%B7%B4%E7%99%BB%E5%87%AF%E6%89%98%E6%96%AF) · [Rem (Re:Zero − Starting Life in Another World)](https://zh.moegirl.org.cn/%E9%9B%B7%E5%A7%86%28Re%3A%E4%BB%8E%E9%9B%B6%E5%BC%80%E5%A7%8B%E7%9A%84%E5%BC%82%E4%B8%96%E7%95%8C%E7%94%9F%E6%B4%BB%29)
```

```
in:
out:
note:
```

---

## [13] who is kurisu makise lol

**考什么**：随手写法：全小写、口语

**中文译文**：kurisu makise是谁啊

**系统认出**：`route=ask` `state=ambiguous`

**耗时**：入站 1.3s · 问答 1.7s · 回译 2.0s

**中文原回答**：

```
你是指哪一部？《为美好的世界献上祝福！》 / 《CROSS ANGE 天使与龙的轮舞》 / 《ZEGAPAIN》
```

**英文回译**：

```
Which one are you referring to? KonoSuba: God's Blessing on This Wonderful World! / Cross Ange: Rondo of Angel and Dragon / Zegapain
```

```
in:
out:
note:
```

---

## [14] What's the weather like tomorrow?

**考什么**：离题（应被意图校验拦下）

**中文译文**：明天天气怎么样？

**系统认出**：`route=ask` `state=unknown`

**耗时**：入站 0.9s · 问答 1.0s · 回译 1.8s

**中文原回答**：

```
这似乎不是关于动画的问题呢，要不要换个和番剧、角色相关的问法？
```

**英文回译**：

```
This doesn't seem to be a question about anime. Would you like to try asking something related to anime series or characters instead?
```

```
in:
out:
note:
```

---
