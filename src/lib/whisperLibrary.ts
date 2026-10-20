export type WhisperCategory =
  | "note_encouragement"
  | "todo_encouragement"
  | "note_care"
  | "todo_care"
  | "after_ten"
  | "late_night"
  | "seasonal"
  | "easter_eggs"
  | "companion";

export type WhisperTone =
  | "gentle"
  | "poetic"
  | "playful"
  | "calm"
  | "cozy"
  | "reflective";

export type WhisperSeason = "spring" | "summer" | "autumn" | "winter";

export interface WhisperPhrase {
  id: string;
  text: string;
  category: WhisperCategory;
  tone: WhisperTone;
  season?: WhisperSeason;
}

const p = (
  id: string,
  text: string,
  category: WhisperCategory,
  tone: WhisperTone,
  season?: WhisperSeason,
): WhisperPhrase => ({ id, text, category, tone, season });

export const HELL_PHRASE: WhisperPhrase = p(
  "special-hell",
  "这里是地狱吗",
  "after_ten",
  "playful",
);

const NOTE_ENCOURAGEMENT: WhisperPhrase[] = [
  p("ne-01", "这一笔，落得刚刚好。", "note_encouragement", "gentle"),
  p("ne-02", "纸面又多了一点光。", "note_encouragement", "poetic"),
  p("ne-03", "记下来，心就轻一点。", "note_encouragement", "calm"),
  p("ne-04", "你给此刻留了位置。", "note_encouragement", "cozy"),
  p("ne-05", "今天也有一点被接住。", "note_encouragement", "gentle"),
  p("ne-06", "这一条，很像你。", "note_encouragement", "gentle"),
  p("ne-07", "思绪有了落点。", "note_encouragement", "calm"),
  p("ne-08", "写下来，就不算走丢。", "note_encouragement", "poetic"),
  p("ne-09", "小小一笔，也算数。", "note_encouragement", "playful"),
  p("ne-10", "纸页又厚了一点。", "note_encouragement", "cozy"),
  p("ne-11", "你正在收集自己。", "note_encouragement", "reflective"),
  p("ne-12", "这一刻被你留住了。", "note_encouragement", "gentle"),
  p("ne-13", "慢慢写，来得及。", "note_encouragement", "calm"),
  p("ne-14", "灵感有地方坐了。", "note_encouragement", "playful"),
  p("ne-15", "今天的碎片有了家。", "note_encouragement", "cozy"),
  p("ne-16", "记下的，会回来找你。", "note_encouragement", "poetic"),
  p("ne-17", "你在认真生活。", "note_encouragement", "gentle"),
  p("ne-18", "这张纸有你的温度。", "note_encouragement", "cozy"),
  p("ne-19", "一个念头，有了名字。", "note_encouragement", "poetic"),
  p("ne-20", "写下来，比想着踏实。", "note_encouragement", "calm"),
  p("ne-21", "你又点亮了一小块。", "note_encouragement", "poetic"),
  p("ne-22", "纸不嫌多，慢慢来。", "note_encouragement", "playful"),
  p("ne-23", "这条会替你记得。", "note_encouragement", "gentle"),
  p("ne-24", "你把自己捡回来一点。", "note_encouragement", "reflective"),
  p("ne-25", "今天没有白过。", "note_encouragement", "calm"),
  p("ne-26", "一笔一画，都是证据。", "note_encouragement", "reflective"),
  p("ne-27", "留在纸上，就不怕忘。", "note_encouragement", "cozy"),
  p("ne-28", "这一刻值得被记住。", "note_encouragement", "gentle"),
  p("ne-29", "你的脑子可以歇会儿了。", "note_encouragement", "playful"),
  p("ne-30", "又攒下一小片日常。", "note_encouragement", "cozy"),
  p("ne-31", "纸面正在长成你的样子。", "note_encouragement", "poetic"),
  p("ne-32", "想到就记，很好。", "note_encouragement", "calm"),
  p("ne-33", "这条记录，刚刚好。", "note_encouragement", "gentle"),
  p("ne-34", "你在给自己回信。", "note_encouragement", "poetic"),
  p("ne-35", "小小记录，大大安心。", "note_encouragement", "playful"),
  p("ne-36", "这一天有了注脚。", "note_encouragement", "reflective"),
  p("ne-37", "先记下来，再慢慢想。", "note_encouragement", "calm"),
  p("ne-38", "你的生活有迹可循。", "note_encouragement", "reflective"),
  p("ne-39", "一笔落下，世界安静了。", "note_encouragement", "poetic"),
  p("ne-40", "这一页又热闹了一点。", "note_encouragement", "cozy"),
  p("ne-41", "给忙碌留个逗号。", "note_encouragement", "calm"),
  p("ne-42", "你记得的，比想象中多。", "note_encouragement", "gentle"),
  p("ne-43", "这条像口袋里的小石头。", "note_encouragement", "poetic"),
  p("ne-44", "记性不好，纸来帮忙。", "note_encouragement", "playful"),
  p("ne-45", "有地方放你的念头了。", "note_encouragement", "cozy"),
  p("ne-46", "你在跟未来的自己说话。", "note_encouragement", "reflective"),
  p("ne-47", "写下来，风吹不走。", "note_encouragement", "poetic"),
  p("ne-48", "今天也留下了一个坐标。", "note_encouragement", "reflective"),
  p("ne-49", "慢慢攒，不着急。", "note_encouragement", "calm"),
  p("ne-50", "纸面记得你的认真。", "note_encouragement", "gentle"),
];

const TODO_ENCOURAGEMENT: WhisperPhrase[] = [
  p("te-01", "第一件小事，落地了。", "todo_encouragement", "gentle"),
  p("te-02", "写下来，就不用一直惦记。", "todo_encouragement", "calm"),
  p("te-03", "清单长了一点，心轻了一点。", "todo_encouragement", "cozy"),
  p("te-04", "这件事有了去处。", "todo_encouragement", "calm"),
  p("te-05", "你替自己安排好了。", "todo_encouragement", "gentle"),
  p("te-06", "先写下来，再慢慢做。", "todo_encouragement", "calm"),
  p("te-07", "一件一件，都会有结果。", "todo_encouragement", "gentle"),
  p("te-08", "小小的待办也算进度。", "todo_encouragement", "playful"),
  p("te-09", "你已经开始了。", "todo_encouragement", "gentle"),
  p("te-10", "把忙乱放进格子里。", "todo_encouragement", "poetic"),
  p("te-11", "这件事不再飘着了。", "todo_encouragement", "calm"),
  p("te-12", "记下来，就是照顾自己。", "todo_encouragement", "cozy"),
  p("te-13", "清单是你的备忘录。", "todo_encouragement", "calm"),
  p("te-14", "今天有方向了。", "todo_encouragement", "gentle"),
  p("te-15", "一件小事，稳住一天。", "todo_encouragement", "calm"),
  p("te-16", "你把它接住了。", "todo_encouragement", "gentle"),
  p("te-17", "写下的，会替你盯着。", "todo_encouragement", "cozy"),
  p("te-18", "待办又清楚了一点。", "todo_encouragement", "calm"),
  p("te-19", "你已经想好下一步。", "todo_encouragement", "reflective"),
  p("te-20", "慢慢来，清单不会跑。", "todo_encouragement", "playful"),
  p("te-21", "这件小事值得被认真对待。", "todo_encouragement", "gentle"),
  p("te-22", "你给自己留了线索。", "todo_encouragement", "poetic"),
  p("te-23", "先记下，别让它占脑子。", "todo_encouragement", "calm"),
  p("te-24", "清单里藏着你的秩序。", "todo_encouragement", "reflective"),
  p("te-25", "一项项来，不慌。", "todo_encouragement", "calm"),
  p("te-26", "你已经很会安排了。", "todo_encouragement", "gentle"),
  p("te-27", "这件事有着落了。", "todo_encouragement", "calm"),
  p("te-28", "待办不是催促，是提醒。", "todo_encouragement", "reflective"),
  p("te-29", "你给明天留了一盏灯。", "todo_encouragement", "poetic"),
  p("te-30", "一件一件，慢慢清。", "todo_encouragement", "calm"),
  p("te-31", "写下来，就不会漏掉。", "todo_encouragement", "calm"),
  p("te-32", "你在替未来的自己减负。", "todo_encouragement", "reflective"),
  p("te-33", "清单又踏实了一格。", "todo_encouragement", "cozy"),
  p("te-34", "这件事，先放在这里。", "todo_encouragement", "calm"),
  p("te-35", "你已经准备好去做了。", "todo_encouragement", "gentle"),
  p("te-36", "小小一格，也是推进。", "todo_encouragement", "playful"),
  p("te-37", "把惦记变成行动。", "todo_encouragement", "reflective"),
  p("te-38", "今天的你很有条理。", "todo_encouragement", "gentle"),
  p("te-39", "事有归处，心有余地。", "todo_encouragement", "poetic"),
  p("te-40", "记得回来打勾。", "todo_encouragement", "playful"),
];

const NOTE_CARE: WhisperPhrase[] = [
  p("nc-01", "写得有点多了，歇一会儿。", "note_care", "gentle"),
  p("nc-02", "眼睛也累了吧。", "note_care", "gentle"),
  p("nc-03", "纸页记得住，你不用硬撑。", "note_care", "calm"),
  p("nc-04", "慢一点，字不会跑。", "note_care", "calm"),
  p("nc-05", "写了这么多，喝口水吧。", "note_care", "cozy"),
  p("nc-06", "今天已经够充实了。", "note_care", "gentle"),
  p("nc-07", "别把弦绷得太紧。", "note_care", "calm"),
  p("nc-08", "留一点空白给自己。", "note_care", "poetic"),
  p("nc-09", "累的话，就少写一点。", "note_care", "gentle"),
  p("nc-10", "你的感受比记录重要。", "note_care", "reflective"),
  p("nc-11", "写到这里，也可以停一停。", "note_care", "calm"),
  p("nc-12", "别急，时间还在。", "note_care", "calm"),
  p("nc-13", "让肩膀松下来。", "note_care", "cozy"),
  p("nc-14", "你不是机器，慢慢来。", "note_care", "gentle"),
  p("nc-15", "记录是为了生活，不是相反。", "note_care", "reflective"),
  p("nc-16", "停一下，看看窗外。", "note_care", "poetic"),
  p("nc-17", "这几条已经很多了。", "note_care", "calm"),
  p("nc-18", "给脑子一点呼吸。", "note_care", "cozy"),
  p("nc-19", "今天可以对自己温柔点。", "note_care", "gentle"),
  p("nc-20", "写不动就明天再写。", "note_care", "calm"),
  p("nc-21", "你已经很努力了。", "note_care", "gentle"),
  p("nc-22", "纸面不需要填满。", "note_care", "poetic"),
  p("nc-23", "留点力气给今晚。", "note_care", "cozy"),
  p("nc-24", "别让记录变成负担。", "note_care", "calm"),
  p("nc-25", "慢慢写，别赶。", "note_care", "calm"),
  p("nc-26", "你的节奏刚刚好。", "note_care", "gentle"),
  p("nc-27", "歇一会儿，再回来。", "note_care", "cozy"),
  p("nc-28", "空白也是一种记录。", "note_care", "poetic"),
  p("nc-29", "今天别太满。", "note_care", "calm"),
  p("nc-30", "照顾好拿笔的这只手。", "note_care", "gentle"),
];

const TODO_CARE: WhisperPhrase[] = [
  p("tc-01", "事情不少，先挑一件。", "todo_care", "calm"),
  p("tc-02", "清单再长，也要吃饭。", "todo_care", "cozy"),
  p("tc-03", "不用一次做完。", "todo_care", "calm"),
  p("tc-04", "做不完也没关系。", "todo_care", "gentle"),
  p("tc-05", "给今天留一点余地。", "todo_care", "poetic"),
  p("tc-06", "记得起身走一走。", "todo_care", "gentle"),
  p("tc-07", "你不是待办机器。", "todo_care", "playful"),
  p("tc-08", "可以明天再继续。", "todo_care", "calm"),
  p("tc-09", "完成一件就很好。", "todo_care", "gentle"),
  p("tc-10", "别被清单追着跑。", "todo_care", "calm"),
  p("tc-11", "先照顾自己，再照顾清单。", "todo_care", "gentle"),
  p("tc-12", "累了就划掉一条。", "todo_care", "playful"),
  p("tc-13", "清单可以等，身体不行。", "todo_care", "calm"),
  p("tc-14", "今天做到这里也算数。", "todo_care", "gentle"),
  p("tc-15", "别把每件事都做满。", "todo_care", "calm"),
  p("tc-16", "做完一件，就夸夸自己。", "todo_care", "playful"),
  p("tc-17", "慢一点，别漏掉呼吸。", "todo_care", "poetic"),
  p("tc-18", "留一件事给明天。", "todo_care", "calm"),
  p("tc-19", "清单不是审判书。", "todo_care", "reflective"),
  p("tc-20", "你已经做得够多了。", "todo_care", "gentle"),
  p("tc-21", "先喝杯水再说。", "todo_care", "cozy"),
  p("tc-22", "做不完，天也不会塌。", "todo_care", "playful"),
  p("tc-23", "把节奏放慢一点。", "todo_care", "calm"),
  p("tc-24", "待办可以排队，你不必。", "todo_care", "playful"),
  p("tc-25", "今天先这样，也可以。", "todo_care", "gentle"),
  p("tc-26", "别把所有事都扛着。", "todo_care", "calm"),
  p("tc-27", "记得看看窗外。", "todo_care", "poetic"),
  p("tc-28", "完成比完美重要。", "todo_care", "reflective"),
  p("tc-29", "你已经很棒了，真的。", "todo_care", "gentle"),
  p("tc-30", "停下也是一种完成。", "todo_care", "reflective"),
];

const AFTER_TEN: WhisperPhrase[] = [
  p("at-01", "十件了，今天很能装。", "after_ten", "playful"),
  p("at-02", "纸面开始有点拥挤。", "after_ten", "playful"),
  p("at-03", "你的抽屉又满了。", "after_ten", "playful"),
  p("at-04", "十全十美，大概如此。", "after_ten", "playful"),
  p("at-05", "数量到了，质量随缘。", "after_ten", "playful"),
  p("at-06", "今天的手很勤快。", "after_ten", "gentle"),
  p("at-07", "再写就成册了。", "after_ten", "playful"),
  p("at-08", "纸页开始排队。", "after_ten", "poetic"),
  p("at-09", "你已经很有存货了。", "after_ten", "playful"),
  p("at-10", "第十件，稳稳收下。", "after_ten", "calm"),
  p("at-11", "记录成瘾，也挺好。", "after_ten", "playful"),
  p("at-12", "这一天被你写厚了。", "after_ten", "poetic"),
  p("at-13", "十件小事，一整页。", "after_ten", "cozy"),
  p("at-14", "再记一条就装订。", "after_ten", "playful"),
  p("at-15", "你的生活密度很高。", "after_ten", "reflective"),
  p("at-16", "纸面说它还能撑。", "after_ten", "playful"),
  p("at-17", "今天很值得归档。", "after_ten", "cozy"),
  p("at-18", "十件，刚好一整页。", "after_ten", "calm"),
  p("at-19", "你的手速有点惊人。", "after_ten", "playful"),
  p("at-20", "这页纸开始有分量。", "after_ten", "reflective"),
  p("at-21", "第十次，轻车熟路。", "after_ten", "calm"),
  p("at-22", "再写就要换本了。", "after_ten", "playful"),
  p("at-23", "今天的你很认真。", "after_ten", "gentle"),
  p("at-24", "十件，给自己鼓掌。", "after_ten", "playful"),
  p("at-25", "纸页还没喊停。", "after_ten", "playful"),
];

const LATE_NIGHT: WhisperPhrase[] = [
  p("ln-01", "夜深了，早点睡。", "late_night", "gentle"),
  p("ln-02", "纸不会跑，觉会少。", "late_night", "gentle"),
  p("ln-03", "明天再写也来得及。", "late_night", "calm"),
  p("ln-04", "把灯关小一点吧。", "late_night", "cozy"),
  p("ln-05", "眼睛需要休息。", "late_night", "gentle"),
  p("ln-06", "现在是睡眠时间。", "late_night", "calm"),
  p("ln-07", "别熬太晚，早点睡。", "late_night", "gentle"),
  p("ln-08", "写到这里就去睡。", "late_night", "gentle"),
  p("ln-09", "夜里想法多，明天再理。", "late_night", "calm"),
  p("ln-10", "你比记录重要。", "late_night", "gentle"),
  p("ln-11", "先睡，明天再来。", "late_night", "calm"),
  p("ln-12", "夜晚适合休息，不适合硬撑。", "late_night", "gentle"),
  p("ln-13", "把今天放到这里就好。", "late_night", "calm"),
  p("ln-14", "去睡吧，我替你守着。", "late_night", "poetic"),
  p("ln-15", "深夜的念头，明天再收。", "late_night", "calm"),
  p("ln-16", "别让屏幕陪你到天亮。", "late_night", "gentle"),
  p("ln-17", "现在最该做的是休息。", "late_night", "calm"),
  p("ln-18", "明天的你会感谢今晚早睡。", "late_night", "gentle"),
  p("ln-19", "放下手机，闭上眼。", "late_night", "calm"),
  p("ln-20", "深夜不适合做决定。", "late_night", "calm"),
  p("ln-21", "先照顾好自己。", "late_night", "gentle"),
  p("ln-22", "你也可以什么都不写。", "late_night", "gentle"),
  p("ln-23", "关灯，睡觉，明天见。", "late_night", "cozy"),
  p("ln-24", "熬夜的账，身体会记得。", "late_night", "gentle"),
  p("ln-25", "夜里安静，适合休息。", "late_night", "poetic"),
  p("ln-26", "去睡吧，这里不会丢。", "late_night", "gentle"),
  p("ln-27", "明天还有一整页。", "late_night", "poetic"),
  p("ln-28", "别和困意硬碰硬。", "late_night", "playful"),
  p("ln-29", "今天已经够长了。", "late_night", "calm"),
  p("ln-30", "让脑子休息一会儿。", "late_night", "calm"),
  p("ln-31", "深夜里，先心疼自己。", "late_night", "gentle"),
  p("ln-32", "你已经很辛苦了。", "late_night", "gentle"),
  p("ln-33", "睡觉也是一种完成。", "late_night", "calm"),
  p("ln-34", "明天醒来再继续。", "late_night", "calm"),
  p("ln-35", "把疲惫留在纸上。", "late_night", "poetic"),
  p("ln-36", "该睡了，真的该睡了。", "late_night", "playful"),
  p("ln-37", "夜色很深，该回家了。", "late_night", "poetic"),
  p("ln-38", "先睡一觉，再想别的。", "late_night", "gentle"),
  p("ln-39", "纸面也需要关灯。", "late_night", "poetic"),
  p("ln-40", "天亮之前，先睡一会儿。", "late_night", "gentle"),
];

const SEASONAL: WhisperPhrase[] = [
  p("se-01", "春天的风，适合记点小事。", "seasonal", "poetic", "spring"),
  p("se-02", "新叶冒头，日子也轻了。", "seasonal", "poetic", "spring"),
  p("se-03", "把春天夹进纸页里。", "seasonal", "cozy", "spring"),
  p("se-04", "花开得慢，你也慢一点。", "seasonal", "gentle", "spring"),
  p("se-05", "春日的午后，适合发呆。", "seasonal", "calm", "spring"),
  p("se-06", "夏天很长，慢慢记录。", "seasonal", "calm", "summer"),
  p("se-07", "蝉声里，写下一点凉。", "seasonal", "poetic", "summer"),
  p("se-08", "晚风把夏天吹进窗。", "seasonal", "poetic", "summer"),
  p("se-09", "冰镇过的傍晚，正好写字。", "seasonal", "cozy", "summer"),
  p("se-10", "夏天适合把日子过慢。", "seasonal", "calm", "summer"),
  p("se-11", "秋叶落下，纸页接住。", "seasonal", "poetic", "autumn"),
  p("se-12", "晚风有点凉，记得添衣。", "seasonal", "gentle", "autumn"),
  p("se-13", "秋天适合收好旧事。", "seasonal", "reflective", "autumn"),
  p("se-14", "把落叶夹进今天的记录。", "seasonal", "cozy", "autumn"),
  p("se-15", "秋天的光，落在纸上。", "seasonal", "poetic", "autumn"),
  p("se-16", "冬天适合靠近一点温暖。", "seasonal", "cozy", "winter"),
  p("se-17", "窗外的冷，留给窗外。", "seasonal", "calm", "winter"),
  p("se-18", "把灯留着，把话写下。", "seasonal", "cozy", "winter"),
  p("se-19", "冬夜漫长，慢慢来。", "seasonal", "calm", "winter"),
  p("se-20", "一杯热茶，一页冬天。", "seasonal", "cozy", "winter"),
];

const EASTER_EGGS: WhisperPhrase[] = [
  p("ee-01", "今天的小纸条有点多。", "easter_eggs", "playful"),
  p("ee-02", "纸面偷偷打了个哈欠。", "easter_eggs", "playful"),
  p("ee-03", "记录精灵正在加班。", "easter_eggs", "playful"),
  p("ee-04", "你已经收集了不少日子。", "easter_eggs", "gentle"),
  p("ee-05", "这条被纸页悄悄收藏。", "easter_eggs", "poetic"),
  p("ee-06", "今天的你有点可爱。", "easter_eggs", "playful"),
  p("ee-07", "纸页说它喜欢你。", "easter_eggs", "playful"),
  p("ee-08", "世界很吵，这里很轻。", "easter_eggs", "calm"),
  p("ee-09", "悄悄告诉你：你做得不错。", "easter_eggs", "gentle"),
  p("ee-10", "这句话是随机掉落的。", "easter_eggs", "playful"),
  p("ee-11", "你触发了隐藏的小纸条。", "easter_eggs", "playful"),
  p("ee-12", "纸面决定给你一个拥抱。", "easter_eggs", "cozy"),
  p("ee-13", "今天的彩蛋归你。", "easter_eggs", "playful"),
  p("ee-14", "没有什么，只是想见你。", "easter_eggs", "poetic"),
  p("ee-15", "恭喜，捡到一句废话。", "easter_eggs", "playful"),
];

const COMPANION: WhisperPhrase[] = [
  p("cp-01", "我还在，你慢慢写。", "companion", "gentle"),
  p("cp-02", "纸页一直陪着你。", "companion", "cozy"),
  p("cp-03", "今天也一起走到这里。", "companion", "gentle"),
  p("cp-04", "你的日常，有人接着。", "companion", "gentle"),
  p("cp-05", "这里一直亮着一盏灯。", "companion", "cozy"),
  p("cp-06", "你写，我记着。", "companion", "gentle"),
  p("cp-07", "慢慢来，不孤单。", "companion", "gentle"),
  p("cp-08", "这一页陪你到很晚。", "companion", "cozy"),
  p("cp-09", "继续吧，我在旁边。", "companion", "gentle"),
  p("cp-10", "你的碎片，我都收着。", "companion", "cozy"),
  p("cp-11", "今天也辛苦了。", "companion", "gentle"),
  p("cp-12", "纸面记得你的脚步声。", "companion", "poetic"),
  p("cp-13", "你不需要一个人扛。", "companion", "gentle"),
  p("cp-14", "这里永远有你的位置。", "companion", "cozy"),
  p("cp-15", "写下一点，就靠近一点。", "companion", "poetic"),
  p("cp-16", "夜深了，也有灯。", "companion", "cozy"),
  p("cp-17", "你的日子有人看见。", "companion", "gentle"),
  p("cp-18", "这一页不会催你。", "companion", "calm"),
  p("cp-19", "慢慢攒，慢慢过。", "companion", "calm"),
  p("cp-20", "我们还有很多页。", "companion", "cozy"),
];

export const WHISPER_LIBRARY: WhisperPhrase[] = [
  ...NOTE_ENCOURAGEMENT,
  ...TODO_ENCOURAGEMENT,
  ...NOTE_CARE,
  ...TODO_CARE,
  ...AFTER_TEN,
  ...LATE_NIGHT,
  ...SEASONAL,
  ...EASTER_EGGS,
  ...COMPANION,
  HELL_PHRASE,
];

export function seasonForMonth(month: number): WhisperSeason {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

export function phrasesByCategories(
  categories: WhisperCategory[],
): WhisperPhrase[] {
  const allowed = new Set(categories);
  return WHISPER_LIBRARY.filter((phrase) => allowed.has(phrase.category));
}

export const WHISPER_CATEGORY_COUNTS: Record<WhisperCategory, number> = {
  note_encouragement: NOTE_ENCOURAGEMENT.length,
  todo_encouragement: TODO_ENCOURAGEMENT.length,
  note_care: NOTE_CARE.length,
  todo_care: TODO_CARE.length,
  after_ten: AFTER_TEN.length,
  late_night: LATE_NIGHT.length,
  seasonal: SEASONAL.length,
  easter_eggs: EASTER_EGGS.length,
  companion: COMPANION.length,
};
