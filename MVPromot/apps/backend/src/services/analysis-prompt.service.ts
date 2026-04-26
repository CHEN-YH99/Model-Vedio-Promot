import {
  NEGATIVE_PROMPT_PLATFORMS,
  type FrameAnalysis,
  type PlatformPromptContent,
  type PromptLanguageMap,
  type PromptPlatform,
} from '../types/analysis.js';

const SUPPORTED_PLATFORMS: PromptPlatform[] = [
  'sora',
  'runway',
  'kling',
  'pika',
  'wan',
  'hailuo',
  'seedance',
  'happyhorse',
];
const DISTINCT_VALUE_LIMIT = 3;

type VideoSummary = {
  subjects: string[];
  scenes: string[];
  colorTones: string[];
  lightings: string[];
  styles: string[];
  moods: string[];
  cameraAngles: string[];
  cameraMovements: string[];
  sequenceEn: string;
  sequenceZh: string;
};

export function normalizePlatforms(input: string[] | undefined): PromptPlatform[] {
  if (!input || input.length === 0) {
    return ['sora', 'runway'];
  }

  const normalized = input
    .map((item) => item.toLowerCase())
    .filter((item): item is PromptPlatform => SUPPORTED_PLATFORMS.includes(item as PromptPlatform));

  if (normalized.length === 0) {
    return ['sora', 'runway'];
  }

  return Array.from(new Set(normalized));
}

function toPromptLanguageMap(input: { zh: string; en: string }): PromptLanguageMap {
  return {
    zh: input.zh,
    en: input.en,
    bilingual: `中文：${input.zh}\nEnglish: ${input.en}`,
  };
}

export function supportsNegativePrompt(platform: PromptPlatform): boolean {
  return NEGATIVE_PROMPT_PLATFORMS.includes(platform);
}

function buildNegativePromptByPlatform(input: {
  platform: PromptPlatform;
  analysis: FrameAnalysis;
}): PromptLanguageMap | undefined {
  const { platform, analysis } = input;

  if (!supportsNegativePrompt(platform)) {
    return undefined;
  }

  const zh = [
    `低清晰度、模糊、噪点、过曝、欠曝、闪烁、帧抖动`,
    `主体变形、四肢异常、面部畸形、比例错误、重复肢体`,
    `构图混乱、镜头跳切、时序不连续、场景突变、背景漂移`,
    `文字水印、logo、字幕条、边框、马赛克、压缩伪影`,
    `避免与“${analysis.subject} / ${analysis.scene} / ${analysis.style}”无关元素`,
  ].join('；');

  const en = [
    'low resolution, blur, noise, overexposure, underexposure, flicker, frame jitter',
    'deformed subject, bad anatomy, distorted face, wrong proportions, duplicated limbs',
    'chaotic composition, jump cuts, temporal inconsistency, abrupt scene shift, background drift',
    'text watermark, logo, subtitle bars, borders, mosaic, compression artifacts',
    `exclude elements unrelated to ${analysis.subject}, ${analysis.scene}, ${analysis.style}`,
  ].join('; ');

  return toPromptLanguageMap({ zh, en });
}

function dedupeOrdered(values: string[], limit = DISTINCT_VALUE_LIMIT) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) {
      continue;
    }

    const signature = normalized.toLowerCase();
    if (seen.has(signature)) {
      continue;
    }

    seen.add(signature);
    output.push(normalized);

    if (output.length >= limit) {
      break;
    }
  }

  return output;
}

function joinEn(values: string[]) {
  if (values.length === 0) {
    return '';
  }

  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  const tail = values.at(-1);
  return tail ? `${values.slice(0, -1).join(', ')}, and ${tail}` : values.join(', ');
}

function joinZh(values: string[]) {
  return values.join('、');
}

function getTopValues<K extends keyof FrameAnalysis>(
  frames: FrameAnalysis[],
  key: K,
  limit = DISTINCT_VALUE_LIMIT,
) {
  const counter = new Map<string, { value: string; count: number; firstIndex: number }>();

  frames.forEach((frame, index) => {
    const value = frame[key].trim();
    if (!value) {
      return;
    }

    const signature = value.toLowerCase();
    const current = counter.get(signature);

    if (current) {
      current.count += 1;
      return;
    }

    counter.set(signature, {
      value,
      count: 1,
      firstIndex: index,
    });
  });

  return Array.from(counter.values())
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.firstIndex - right.firstIndex;
    })
    .slice(0, limit)
    .map((item) => item.value);
}

function buildSequenceEn(frames: FrameAnalysis[]) {
  if (frames.length === 0) {
    return 'single coherent visual sequence';
  }

  const opening = frames[0]!;
  const midpoint = frames[Math.floor((frames.length - 1) / 2)] ?? opening;
  const ending = frames.at(-1) ?? opening;

  return [
    `opening on ${opening.subject} in ${opening.scene}`,
    `developing through ${midpoint.subject} in ${midpoint.scene}`,
    `closing on ${ending.subject} in ${ending.scene}`,
  ].join(', ');
}

function buildSequenceZh(frames: FrameAnalysis[]) {
  if (frames.length === 0) {
    return '形成统一连贯的视觉段落';
  }

  const opening = frames[0]!;
  const midpoint = frames[Math.floor((frames.length - 1) / 2)] ?? opening;
  const ending = frames.at(-1) ?? opening;

  return [
    `开场聚焦${opening.subject}，位于${opening.scene}`,
    `中段推进到${midpoint.subject}与${midpoint.scene}`,
    `结尾落在${ending.subject}与${ending.scene}`,
  ].join('，');
}

function summarizeVideoFrames(frames: FrameAnalysis[]): VideoSummary {
  if (frames.length === 0) {
    return {
      subjects: ['main subject'],
      scenes: ['generic scene'],
      colorTones: ['balanced color tone'],
      lightings: ['soft lighting'],
      styles: ['cinematic style'],
      moods: ['neutral mood'],
      cameraAngles: ['medium shot'],
      cameraMovements: ['locked camera'],
      sequenceEn: 'single coherent visual sequence',
      sequenceZh: '形成统一连贯的视觉段落',
    };
  }

  const opening = frames[0]!;
  const midpoint = frames[Math.floor((frames.length - 1) / 2)] ?? opening;
  const ending = frames.at(-1) ?? opening;

  return {
    subjects: getTopValues(frames, 'subject'),
    scenes: getTopValues(frames, 'scene'),
    colorTones: getTopValues(frames, 'colorTone'),
    lightings: getTopValues(frames, 'lighting'),
    styles: getTopValues(frames, 'style'),
    moods: getTopValues(frames, 'mood'),
    cameraAngles: getTopValues(frames, 'cameraAngle'),
    cameraMovements: getTopValues(frames, 'cameraMovement'),
    sequenceEn: buildSequenceEn([opening, midpoint, ending]),
    sequenceZh: buildSequenceZh([opening, midpoint, ending]),
  };
}

export function generatePromptByPlatform(input: {
  platform: PromptPlatform;
  analysis: FrameAnalysis;
}): PlatformPromptContent {
  const { platform, analysis } = input;

  const detailEn = `subject: ${analysis.subject}; scene: ${analysis.scene}; camera: ${analysis.cameraAngle}, ${analysis.cameraMovement}; lighting: ${analysis.lighting}; color: ${analysis.colorTone}; style: ${analysis.style}; mood: ${analysis.mood}`;
  const detailZh = `主体：${analysis.subject}；场景：${analysis.scene}；镜头：${analysis.cameraAngle}，${analysis.cameraMovement}；光线：${analysis.lighting}；色调：${analysis.colorTone}；风格：${analysis.style}；氛围：${analysis.mood}`;

  const enBase = {
    sora: `cinematic video, ${detailEn}, physically plausible motion, coherent environment details, no unrelated elements`,
    runway: `${analysis.cameraMovement}, ${analysis.cameraAngle}; ${detailEn}; precise framing and natural texture, no unrelated elements`,
    kling: `${detailEn}; emphasize continuous action and scene consistency, no unrelated elements`,
    pika: `${detailEn}; concise but concrete motion and atmosphere, no unrelated elements`,
    wan: `${detailEn}; balanced bilingual-friendly visual semantics, no unrelated elements`,
    hailuo: `${detailEn}; prioritize Chinese-style visual narrative coherence, no unrelated elements`,
    seedance: `${detailEn}; emphasize dance-like rhythm, smooth motion cadence, and temporal consistency, no unrelated elements`,
    happyhorse: `${detailEn}; reinforce cheerful storytelling, stable subject identity, and expressive cinematic flow, no unrelated elements`,
  } as const;

  const zhBase = {
    sora: `电影感视频，${detailZh}，动作与环境物理一致，不要加入无关元素`,
    runway: `${analysis.cameraMovement}，${analysis.cameraAngle}；${detailZh}；镜头构图清晰、材质真实，不要加入无关元素`,
    kling: `${detailZh}；强调动作连贯与场景一致，不要加入无关元素`,
    pika: `${detailZh}；描述简洁但具体，突出运动与氛围，不要加入无关元素`,
    wan: `${detailZh}；表达兼顾中英语义，不要加入无关元素`,
    hailuo: `${detailZh}；优先中文叙事连贯性，不要加入无关元素`,
    seedance: `${detailZh}；强调舞蹈感节奏、动作律动与时间连续性，不要加入无关元素`,
    happyhorse: `${detailZh}；强化欢快叙事、主体稳定与镜头表达流畅，不要加入无关元素`,
  } as const;

  return {
    prompt: toPromptLanguageMap({
      zh: zhBase[platform],
      en: enBase[platform],
    }),
    negativePrompt: buildNegativePromptByPlatform({
      platform,
      analysis,
    }),
  };
}

export function summarizeAnalysisFrames(frames: FrameAnalysis[]): FrameAnalysis {
  if (frames.length === 0) {
    return {
      subject: 'main subject',
      scene: 'generic scene',
      colorTone: 'balanced color tone',
      lighting: 'soft lighting',
      style: 'cinematic',
      mood: 'neutral',
      cameraAngle: 'medium shot',
      cameraMovement: 'steady camera',
    };
  }

  const pickMost = <K extends keyof FrameAnalysis>(key: K) => {
    const counter = new Map<string, number>();
    const fallback = frames[0] as FrameAnalysis;

    for (const frame of frames) {
      const value = frame[key].trim();
      counter.set(value, (counter.get(value) ?? 0) + 1);
    }

    let winner = fallback[key];
    let max = 0;

    for (const [value, count] of counter) {
      if (count > max) {
        max = count;
        winner = value as FrameAnalysis[K];
      }
    }

    return winner;
  };

  return {
    subject: pickMost('subject'),
    scene: pickMost('scene'),
    colorTone: pickMost('colorTone'),
    lighting: pickMost('lighting'),
    style: pickMost('style'),
    mood: pickMost('mood'),
    cameraAngle: pickMost('cameraAngle'),
    cameraMovement: pickMost('cameraMovement'),
  };
}

export function generateOverallPromptByPlatform(input: {
  frames: FrameAnalysis[];
  platforms: PromptPlatform[];
}) {
  const summary = summarizeVideoFrames(input.frames);

  const subjectsEn = joinEn(dedupeOrdered(summary.subjects));
  const scenesEn = joinEn(dedupeOrdered(summary.scenes));
  const stylesEn = joinEn(dedupeOrdered(summary.styles));
  const moodsEn = joinEn(dedupeOrdered(summary.moods));
  const colorsEn = joinEn(dedupeOrdered(summary.colorTones));
  const lightingsEn = joinEn(dedupeOrdered(summary.lightings));
  const anglesEn = joinEn(dedupeOrdered(summary.cameraAngles));
  const movementsEn = joinEn(dedupeOrdered(summary.cameraMovements));

  const subjectsZh = joinZh(dedupeOrdered(summary.subjects));
  const scenesZh = joinZh(dedupeOrdered(summary.scenes));
  const stylesZh = joinZh(dedupeOrdered(summary.styles));
  const moodsZh = joinZh(dedupeOrdered(summary.moods));
  const colorsZh = joinZh(dedupeOrdered(summary.colorTones));
  const lightingsZh = joinZh(dedupeOrdered(summary.lightings));
  const anglesZh = joinZh(dedupeOrdered(summary.cameraAngles));
  const movementsZh = joinZh(dedupeOrdered(summary.cameraMovements));

  const overallEn = {
    sora: `cinematic multi-shot video featuring ${subjectsEn}; visual progression: ${summary.sequenceEn}; recurring environments: ${scenesEn}; visual language: ${stylesEn}, ${colorsEn}, ${lightingsEn}; camera design: ${anglesEn} with ${movementsEn}; emotional arc: ${moodsEn}; preserve subject consistency, temporal continuity, and coherent environment detail, no unrelated elements`,
    runway: `${movementsEn}; multi-shot sequence featuring ${subjectsEn}; progression: ${summary.sequenceEn}; scene coverage: ${scenesEn}; look and texture: ${stylesEn}, ${colorsEn}, ${lightingsEn}; framing: ${anglesEn}; emotional arc: ${moodsEn}; seamless shot-to-shot continuity, realistic detail, no unrelated elements`,
    kling: `multi-shot video centered on ${subjectsEn}; sequence progression: ${summary.sequenceEn}; environments: ${scenesEn}; style system: ${stylesEn}; color and lighting: ${colorsEn}, ${lightingsEn}; camera language: ${anglesEn}, ${movementsEn}; emotional progression: ${moodsEn}; keep scene continuity and subject consistency, no unrelated elements`,
    pika: `dynamic multi-shot video of ${subjectsEn}; progression: ${summary.sequenceEn}; environments: ${scenesEn}; atmosphere: ${moodsEn}; look: ${stylesEn}, ${colorsEn}, ${lightingsEn}; camera: ${anglesEn}, ${movementsEn}; concise but coherent sequence, no unrelated elements`,
    wan: `professional full-video prompt featuring ${subjectsEn}; progression: ${summary.sequenceEn}; environments: ${scenesEn}; visual system: ${stylesEn}, ${colorsEn}, ${lightingsEn}; camera grammar: ${anglesEn}, ${movementsEn}; emotional arc: ${moodsEn}; preserve bilingual-friendly clarity and continuity, no unrelated elements`,
    hailuo: `continuous cinematic sequence centered on ${subjectsEn}; progression: ${summary.sequenceEn}; scene coverage: ${scenesEn}; style and atmosphere: ${stylesEn}, ${moodsEn}; lighting and color: ${lightingsEn}, ${colorsEn}; camera approach: ${anglesEn}, ${movementsEn}; coherent narrative flow, no unrelated elements`,
    seedance: `rhythmic multi-shot sequence featuring ${subjectsEn}; progression: ${summary.sequenceEn}; environments: ${scenesEn}; movement rhythm: ${movementsEn}; visual style: ${stylesEn}, ${colorsEn}, ${lightingsEn}; framing and angle: ${anglesEn}; emotional cadence: ${moodsEn}; maintain dance-like temporal continuity and coherent action arcs, no unrelated elements`,
    happyhorse: `story-forward multi-shot video with ${subjectsEn}; narrative progression: ${summary.sequenceEn}; scene coverage: ${scenesEn}; visual atmosphere: ${stylesEn}, ${moodsEn}; lighting and color palette: ${lightingsEn}, ${colorsEn}; camera language: ${anglesEn}, ${movementsEn}; keep identity consistency, cheerful tone, and smooth shot transitions, no unrelated elements`,
  } as const;

  const overallZh = {
    sora: `电影感整段视频，核心主体为${subjectsZh}；镜头推进为：${summary.sequenceZh}；主要场景包含${scenesZh}；整体视觉语言为${stylesZh}，配合${colorsZh}与${lightingsZh}；镜头设计使用${anglesZh}和${movementsZh}；情绪走势为${moodsZh}；保持角色一致、时间连续、环境细节统一，不要加入无关元素`,
    runway: `${movementsZh}；整段多镜头视频围绕${subjectsZh}展开；镜头推进为：${summary.sequenceZh}；场景覆盖${scenesZh}；整体质感为${stylesZh}，结合${colorsZh}与${lightingsZh}；构图景别采用${anglesZh}；情绪变化为${moodsZh}；保证镜头衔接自然、材质真实，不要加入无关元素`,
    kling: `整段视频以${subjectsZh}为核心；叙事推进为：${summary.sequenceZh}；场景包含${scenesZh}；画面风格为${stylesZh}；色调与光线为${colorsZh}、${lightingsZh}；镜头语言为${anglesZh}、${movementsZh}；情绪氛围为${moodsZh}；强调整片连贯性与主体统一，不要加入无关元素`,
    pika: `整段动态视频围绕${subjectsZh}展开；镜头推进为：${summary.sequenceZh}；主要场景为${scenesZh}；整体氛围是${moodsZh}；视觉呈现为${stylesZh}，结合${colorsZh}与${lightingsZh}；镜头语言为${anglesZh}、${movementsZh}；描述简洁但要保持整片一致，不要加入无关元素`,
    wan: `专业整片提示词：视频主体为${subjectsZh}；镜头推进为：${summary.sequenceZh}；场景覆盖${scenesZh}；整体视觉系统为${stylesZh}、${colorsZh}、${lightingsZh}；镜头语法使用${anglesZh}与${movementsZh}；情绪弧线为${moodsZh}；保证表达清晰、全片连续，不要加入无关元素`,
    hailuo: `整段连续影像以${subjectsZh}为主线；推进节奏为：${summary.sequenceZh}；场景包含${scenesZh}；风格与情绪分别为${stylesZh}、${moodsZh}；色调和光线为${colorsZh}、${lightingsZh}；镜头语言为${anglesZh}、${movementsZh}；保持中文叙事连贯与画面统一，不要加入无关元素`,
    seedance: `节奏型整段视频以${subjectsZh}为核心；镜头推进为：${summary.sequenceZh}；场景覆盖${scenesZh}；动作律动突出${movementsZh}；视觉风格为${stylesZh}，结合${colorsZh}与${lightingsZh}；景别与机位为${anglesZh}；情绪节拍为${moodsZh}；保持舞蹈感节奏与动作连续，不要加入无关元素`,
    happyhorse: `叙事型整段视频围绕${subjectsZh}展开；故事推进为：${summary.sequenceZh}；场景包含${scenesZh}；整体氛围为${stylesZh}与${moodsZh}；色调光线为${colorsZh}、${lightingsZh}；镜头语言为${anglesZh}、${movementsZh}；保持主体一致、情绪明快、转场顺滑，不要加入无关元素`,
  } as const;

  return input.platforms.reduce<Partial<Record<PromptPlatform, PlatformPromptContent>>>((acc, platform) => {
    const overallPrompt = toPromptLanguageMap({
      zh: overallZh[platform],
      en: overallEn[platform],
    });

    const negativePrompt = buildNegativePromptByPlatform({
      platform,
      analysis: {
        subject: subjectsEn || 'main subject',
        scene: scenesEn || 'generic scene',
        colorTone: colorsEn || 'balanced color tone',
        lighting: lightingsEn || 'soft lighting',
        style: stylesEn || 'cinematic style',
        mood: moodsEn || 'neutral mood',
        cameraAngle: anglesEn || 'medium shot',
        cameraMovement: movementsEn || 'steady camera',
      },
    });

    acc[platform] = {
      prompt: overallPrompt,
      negativePrompt,
    };

    return acc;
  }, {});
}

export function extractStyleTags(frames: FrameAnalysis[]): string[] {
  const tags = new Set<string>();

  for (const frame of frames) {
    [
      frame.style,
      frame.mood,
      frame.colorTone,
      frame.lighting,
      frame.cameraMovement,
      frame.cameraAngle,
    ].forEach((tag) => {
      const normalized = tag.trim().toLowerCase();
      if (normalized.length > 0) {
        tags.add(normalized);
      }
    });

    if (tags.size >= 20) {
      break;
    }
  }

  return Array.from(tags).slice(0, 20);
}
