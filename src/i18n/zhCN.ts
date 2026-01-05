 /**
  * 简体中文字符串资源
  * leojam studio - 嘻哈节拍工作站
  */

export const i18n = {
  // 应用信息
  app: {
    name: 'leojam studio',
    subtitle: '嘻哈节拍工作站',
    description: '基于 React、TypeScript 和 Tone.js 构建的全功能 DAW',
  },

  // 传输控制
  transport: {
    play: '播放',
    pause: '暂停',
    stop: '停止',
    record: '录制',
    loop: '循环',
    bpm: 'BPM',
    timeSignature: '拍号',
  },

  // 视图/导航
  views: {
    playlist: '编曲',
    pianoRoll: '钢琴卷帘',
    stepSequencer: '鼓机',
    mixer: '混音台',
    browser: '素材库',
    automation: '自动化',
  },

  // 工具栏
  toolbar: {
    undo: '撤销',
    redo: '重做',
    save: '保存工程',
    load: '导入工程',
    exportMidi: '导出 MIDI',
    exportWav: '导出 WAV',
    newProject: '新建工程',
  },

  // 浏览器/素材库
  browser: {
    instruments: '乐器',
    drumKits: '鼓组',
    samples: '采样',
    effects: '效果器',
    presets: '预设',
    addInstrument: '添加乐器',
    addDrumKit: '添加鼓组',
    loadSample: '加载采样',
    dropHint: '拖放音频文件到此处',
    noSamples: '暂无采样',
    categories: {
      trap: 'Trap',
      boomBap: 'Boom Bap',
      lofi: 'Lo-fi',
      bass808: '808 Bass',
    },
  },

  // 编曲/播放列表
  playlist: {
    addTrack: '添加轨道',
    deleteTrack: '删除轨道',
    muteTrack: '静音',
    soloTrack: '独奏',
    emptyHint: '点击添加轨道开始编曲',
    clipActions: {
      edit: '编辑',
      copy: '复制',
      paste: '粘贴',
      delete: '删除',
      split: '分割',
    },
  },

  // 钢琴卷帘
  pianoRoll: {
    tool: {
      pencil: '铅笔',
      select: '选择',
      erase: '橡皮擦',
    },
    snap: '吸附',
    quantize: '量化',
    velocity: '力度',
    scale: '音阶',
    key: '调性',
    emptyHint: '使用铅笔工具绘制音符',
  },

  // 鼓机/步进音序器
  stepSequencer: {
    steps: '步数',
    swing: '摇摆',
    humanize: '人性化',
    velocity: '力度',
    subdivisions: '细分',
    rolls: '滚奏',
    clearPattern: '清空节拍',
    randomize: '随机生成',
    emptyHint: '点击网格创建节拍',
  },

  // 混音台
  mixer: {
    master: '主输出',
    volume: '音量',
    pan: '声像',
    mute: '静音',
    solo: '独奏',
    effects: '效果器',
    addEffect: '添加效果器',
    effectTypes: {
      reverb: '混响',
      delay: '延迟',
      distortion: '失真',
      filter: '滤波器',
      compressor: '压缩器',
      eq: '均衡器',
    },
  },

  // 自动化
  automation: {
    title: '自动化',
    addLane: '添加自动化',
    removeLane: '删除自动化',
    enable: '启用',
    disable: '禁用',
    params: {
      volume: '音量',
      pan: '声像',
      mute: '静音',
      tempo: '速度',
      effectWet: '效果湿度',
    },
    curves: {
      linear: '线性',
      exponential: '指数',
      step: '阶梯',
    },
    emptyHint: '点击添加自动化点',
  },

  // 乐器
  instruments: {
    polySynth: '复音合成器',
    monoSynth: '单音合成器',
    sampler: '采样器',
    drumKit: '鼓组',
    bass808: '808 Bass',
  },

  // 通用操作
  actions: {
    add: '添加',
    delete: '删除',
    edit: '编辑',
    copy: '复制',
    paste: '粘贴',
    cut: '剪切',
    selectAll: '全选',
    cancel: '取消',
    confirm: '确认',
    close: '关闭',
    save: '保存',
    load: '加载',
    export: '导出',
    import: '导入',
    reset: '重置',
    clear: '清空',
  },

  // 欢迎页
  welcome: {
    title: '嘻哈节拍工作站',
    subtitle: '基于 React、TypeScript 和 Tone.js 构建的全功能 DAW',
    startButton: '开始制作 ▶',
    features: {
      pianoRoll: {
        title: '钢琴卷帘',
        desc: '完整的 MIDI 编辑器，支持力度控制',
      },
      stepSequencer: {
        title: '鼓机',
        desc: '使用步进音序器创建节拍',
      },
      playlist: {
        title: '编曲',
        desc: '在多轨道上排列 Pattern',
      },
      mixer: {
        title: '混音台',
        desc: '调整音量、声像和效果器',
      },
      instruments: {
        title: '乐器',
        desc: '多种合成器预设和鼓组',
      },
      effects: {
        title: '效果器',
        desc: '混响、延迟、失真等',
      },
    },
    shortcuts: {
      title: '快捷键',
      space: '播放/暂停',
      enter: '停止',
      numbers: '切换视图 (1-6)',
    },
  },

  // 模板
  templates: {
    trap: {
      name: 'Trap 模板',
      desc: '140 BPM，Hi-hat Rolls，808 Bass',
    },
    boomBap: {
      name: 'Boom Bap 模板',
      desc: '90 BPM，Swing 明显，采样驱动',
    },
    lofi: {
      name: 'Lo-fi 模板',
      desc: '柔和氛围，重采样，噪声纹理',
    },
  },

  // 错误提示
  errors: {
    audioContextFailed: '音频初始化失败，请点击页面任意位置后重试',
    loadFailed: '文件加载失败',
    exportFailed: '导出失败',
    unsupportedFormat: '不支持的文件格式',
  },

  // 提示信息
  hints: {
    clickToStart: '点击任意位置启动音频引擎',
    dragToReorder: '拖动调整顺序',
    rightClickForMenu: '右键打开菜单',
  },
} as const

export type I18nKey = keyof typeof i18n
