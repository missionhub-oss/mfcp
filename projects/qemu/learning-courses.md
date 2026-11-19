<!-- SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission -->
<!-- SPDX-License-Identifier: MIT -->

# QEMU 训练营课程

初次接触 QEMU 的贡献者可以从这份课程目录开始。课程按导学、基础、专业和项目四个阶段组织，从开发环境、虚拟化历史和 QEMU 核心概念入手，逐步进入 CPU、SoC、GPGPU 与 Rust 建模，最后结合项目方向开展实践。

## 课程介绍

- **课程**：[QEMU 训练营 2026](https://qemu.gevico.online/tutorial/2026/)
- **主办**：格维开源社区（GTOC）与华中科技大学开放原子开源俱乐部，由清华大学陈渝老师、李明老师倡议发起。
- **视频合集**：[QEMU 训练营 | 格维开源社区](https://space.bilibili.com/483048140/lists/6542936?type=season)
- **语言**：中文。
- **目录核对日期**：2026 年 11 月 19 日。
- **课程安排**：16 周，导学 3 周、基础 2 周、专业 5 周、项目 6 周；2026 年 4 月 5 日开营，8 月 9 日结营。
- **课程规模**：20 余篇讲义、6 个实验方向、4 个项目方向。
- **视频规模**：合集共 93 个视频，总时长 46 小时 38 分 30 秒；其中 2026 年视频 40 个，总时长 16 小时 34 分 5 秒。

课程以 RISC-V 为主要目标架构，使用 QEMU 系统模式讲解机器与设备模型。导学阶段补齐编程、体系结构和模拟器基础；基础阶段建立启动流程、QOM、MemoryRegion 和调试方法的认识；专业阶段从 CPU、SoC、GPGPU 和 Rust 中选择一个方向完成实验；项目阶段围绕 K230、CXL AI 加速卡、大模型外设建模和 Wine-CE 四个方向开展小组实践。

课程录像发布在 B 站合集，讲义和实验说明以官方站点为准。课程内容以 CC BY-SA 4.0 协议授权，代码以 MIT 协议授权。往期视频与当前版本存在代码和接口差异，阅读时以所使用版本的源码为准。

## 开始前的准备

- 能阅读 C 程序，理解指针、结构体、宏和头文件。选择 Rust 方向时再补充 Rust 基础，导学材料提供入门视频。
- 能使用 Linux 终端、Git 和常见构建工具。官方推荐 Ubuntu 22.04 LTS 及以上、Fedora 38 及以上或 Arch Linux，Windows 可以使用 WSL2；不建议直接在 macOS 上编译。
- 了解 CPU、内存、中断和地址空间的基本概念。熟悉 RISC-V 特权级和指令格式更便于理解课程示例。
- 准备足够的磁盘空间和内存编译 QEMU。只编译 `riscv64-softmmu` 可以缩短构建时间，调试版本另建构建目录。
- 记录操作系统、编译器、QEMU 版本（讲义示例使用 v10.0.3）和实际执行的命令。

## 讲义与实验入口

| 资料 | 链接 |
| --- | --- |
| 2026 讲义 | [QEMU 训练营 2026](https://qemu.gevico.online/tutorial/2026/) |
| 2026 实验 | [基础阶段](https://qemu.gevico.online/exercise/2026/stage1/)、[专业阶段](https://qemu.gevico.online/exercise/2026/stage2/)、[项目阶段](https://qemu.gevico.online/exercise/2026/stage3/) |
| 2025 讲义 | [QEMU 训练营 2025](https://qemu.gevico.online/tutorial/2025/) |
| 讲义源码 | [qemu-camp/qemu-camp-tutorial](https://github.com/qemu-camp/qemu-camp-tutorial) |
| 视频合集 | [B 站合集](https://space.bilibili.com/483048140/lists/6542936?type=season) |

## 建议学习顺序

| 阶段 | 时长 | 学习内容 | 阶段产出 |
| --- | --- | --- | --- |
| 导学 | 3 周 | C/Rust 编程基础、RISC-V 与 GPGPU 体系结构、QEMU 环境搭建 | 编译并运行一个 RISC-V 客户机 |
| 基础 | 2 周 | 虚拟化历史、启动参数与流程、QOM、MemoryRegion、调试方法 | 通过 C 或 Rust 基础实验 |
| 专业 | 5 周 | CPU、TCG、MMU、中断、多核、主板、外设、时钟、GPGPU、PCIe、Rust | 通过一个专业方向实验并提交总结博客 |
| 项目 | 6 周 | K230、CXL AI 加速卡、大模型外设建模、Wine-CE | 完成所选方向的项目任务与展示 |

基础阶段实验二选一，专业阶段实验四选一。专业阶段通过后，官方要求向训练营博客提交一篇总结文章，再进入项目阶段。

## 导学阶段

导学阶段用三周时间补齐编程、体系结构和模拟器基础。官方说明这些资料也可以作为后续阶段的补充，已经具备相应基础时可以直接进入基础阶段。

| 主题 | 讲义 | 学习内容 |
| --- | --- | --- |
| QEMU 开发环境 | [QEMU 编译开发环境搭建](https://qemu.gevico.online/tutorial/2026/ch0/qemu-dev-env/) | 安装依赖、获取源码、配置 `riscv64-softmmu`、构建验证和调试工具。 |
| GPU 与 GPGPU | [GPU 发展历史](https://qemu.gevico.online/tutorial/2026/ch0/gpu-history/)、[GPGPU 学习资料](https://qemu.gevico.online/tutorial/2026/ch0/gpgpu-resources/) | GPU 架构演进、SIMT 执行模型、内存层次和学习资料。 |
| 开源协作 | [如何参与 QEMU 邮件列表讨论](https://qemu.gevico.online/blogs/misc/qemu-devel-email/) | 安装 `git-email`、配置 SMTP、使用 `git send-email` 发送补丁并参与讨论。 |
| 常见问答 | [训练营常见问答](https://qemu.gevico.online/tutorial/2026/ch0/qemu-camp-faq/) | 环境搭建、OpenCamp、实验提交和答疑安排。 |

导学阶段的视频按下表顺序观看。开营前的短课用于快速了解课程和相关工具，长视频用于补齐环境与模拟器基础。

| 视频 | 时长 | 学习内容 |
| --- | --- | --- |
| [最后一次入门 C 和 Rust](https://www.bilibili.com/video/BV151FxzmELv/) | 6:36 | C 与 Rust 的入门路径和学习资料。 |
| [轻松了解 GPU 和 RISC-V](https://www.bilibili.com/video/BV1vyFxzEEer/) | 4:24 | GPU 与 RISC-V 的基本概念及其在训练营中的位置。 |
| [一键启动 QEMU 云原生开发环境](https://www.bilibili.com/video/BV15yFxzEEMB/) | 8:52 | 在云端准备 QEMU 开发环境，跳过本地依赖安装。 |
| [ima 知识库助力系统软件学习](https://www.bilibili.com/video/BV1VUFxz1ENn/) | 3:04 | 使用 ima 知识库检索 QEMU、Linux 和 RISC-V 资料。 |
| [轻松参与 QEMU 开源贡献](https://www.bilibili.com/video/BV1VmFxzjE8v/) | 4:15 | 邮件列表、补丁评审和社区参与方式。 |
| [导学阶段 基于 Agent 驱动的 RISC-V 模拟器开发](https://www.bilibili.com/video/BV1PPQTBsE9Q/) | 1:21:16 | 从零搭建 RISC-V 模拟器，演示 Agent 在开发流程中的使用。 |
| [导学阶段 训练营在线答疑回放 第一周](https://www.bilibili.com/video/BV1eMdvBFEex/) | 11:19 | 环境搭建、报名和课程安排的常见问题。 |
| [导学阶段 训练营在线答疑回放 第二周](https://www.bilibili.com/video/BV1SEdvBpE43/) | 24:06 | 实验提交、学习进度和后续阶段的常见问题。 |

## 基础阶段

基础阶段用两周时间认识 QEMU 的核心概念、启动流程和调试方法，并通过编程练习打牢 C 或 Rust 基础。

| 课程 | 讲义 | 视频 | 学习内容 |
| --- | --- | --- | --- |
| 虚拟化技术的发展历史 | [讲义](https://qemu.gevico.online/tutorial/2026/ch1/vm-history/) | [24:34](https://www.bilibili.com/video/BV19xwNzoEMK/) | 虚拟化的技术起源、硬件资源利用、模拟与跨平台、微架构仿真。 |
| QEMU 启动参数分析 | [讲义](https://qemu.gevico.online/tutorial/2026/ch1/qemu-startup-param/) | [25:48](https://www.bilibili.com/video/BV1aVwMzYE8a/) | 常用参数、openEuler 启动示例、Configuration 文件和登录虚拟机。 |
| QEMU 启动流程分析 | [讲义](https://qemu.gevico.online/tutorial/2026/ch1/qemu-init/) | [20:12](https://www.bilibili.com/video/BV1kQwTzmEGc/) | virt machine 初始化、加载客户机、vCPU 执行的第一条指令、主循环与 IO 线程。 |
| QOM 面向对象的建模思想 | [讲义](https://qemu.gevico.online/tutorial/2026/ch1/qemu-qom/) | [30:02](https://www.bilibili.com/video/BV1wGwTzLE7q/) | 类型注册、类型初始化、类型层次结构、对象构造和属性。 |
| MemoryRegion 面向地址空间抽象 | [讲义](https://qemu.gevico.online/tutorial/2026/ch1/qemu-mr/) | [23:20](https://www.bilibili.com/video/BV1sSwuzZEXr/) | 地址空间布局、初始化流程和 MemoryRegion 节点之间的关系。 |
| QEMU 常用调试手段 | [讲义](https://qemu.gevico.online/tutorial/2026/ch1/qemu-debug/) | [17:49](https://www.bilibili.com/video/BV1fwwgzUEt8/) | GDB 调试 QEMU、远程调试客户机、日志系统和追踪事件。 |

配套实验提供 C 和 Rust 两个方向，选择其中一个完成：

- [基础阶段实验总览](https://qemu.gevico.online/exercise/2026/stage1/)
- [C 语言习题](https://qemu.gevico.online/exercise/2026/stage1/learning-c/)
- [Rust 习题](https://qemu.gevico.online/exercise/2026/stage1/learning-rust/)

## 专业阶段

专业阶段用五周时间进入 CPU、SoC、GPGPU 和 Rust 四个建模方向。讲义覆盖全部方向，2026 年课程视频集中讲解 CPU 与 SoC 建模；GPGPU 和 Rust 方向以讲义和实验手册为主。

| 方向 | 课程 | 讲义 | 视频 | 学习内容 |
| --- | --- | --- | --- | --- |
| CPU 建模 | CPU 建模流程 | [讲义](https://qemu.gevico.online/tutorial/2026/ch2/qemu-cpu-model/) | [31:47](https://www.bilibili.com/video/BV1J4AJz7Eda/) | RISC-V CPU 的类型层次、新增 CPU 型号的步骤和 `DEFINE_RISCV_CPU()`。 |
| CPU 建模 | TCG 工作原理（一） | [讲义](https://qemu.gevico.online/tutorial/2026/ch2/qemu-tcg/) | [39:13](https://www.bilibili.com/video/BV1QbApzkEmJ/) | QEMU 执行框架、解释执行与动态二进制翻译、TCG 的翻译执行流程。 |
| CPU 建模 | TCG 工作原理（二） | [讲义](https://qemu.gevico.online/tutorial/2026/ch2/qemu-tcg/) | [25:49](https://www.bilibili.com/video/BV1beApzuEmt/) | 承接第一部分的运行流程，讲解翻译块生成、执行和退出。 |
| CPU 建模 | 模拟客户机指令 | [讲义](https://qemu.gevico.online/tutorial/2026/ch2/qemu-insn/) | — | Decodetree、字段提取、参数集合和指令译码的四层抽象。 |
| CPU 建模 | 模拟硬件 MMU（一） | [讲义](https://qemu.gevico.online/tutorial/2026/ch2/qemu-softmmu/) | [20:08](https://www.bilibili.com/video/BV1AXQCBtEiC/) | 地址层次、SoftTLB、`CPUTLBEntry` 与 `CPUTLBEntryFull`。 |
| CPU 建模 | 模拟硬件 MMU（二） | [讲义](https://qemu.gevico.online/tutorial/2026/ch2/qemu-softmmu/) | [24:27](https://www.bilibili.com/video/BV1fnQCBEEW2/) | TLB 的整体组织、TCG 与 SoftMMU 的对接。 |
| CPU 建模 | 模拟中断和异常 | [讲义](https://qemu.gevico.online/tutorial/2026/ch2/qemu-intr/) | [17:43](https://www.bilibili.com/video/BV1zEX4BzEGR/) | 中断、异常和退出请求，主循环检查点，注入与处理路径。 |
| CPU 建模 | 模拟多核场景 | [讲义](https://qemu.gevico.online/tutorial/2026/ch2/qemu-multi-core/) | [14:25](https://www.bilibili.com/video/BV1CMX4BjE6w/) | SMP 拓扑、UMA/NUMA、vCPU 创建和 MTTCG 线程模型。 |
| SoC 建模 | 主板建模流程 | [讲义](https://qemu.gevico.online/tutorial/2026/ch2/qemu-machine/) | [15:00](https://www.bilibili.com/video/BV1v4X4BPEP3/) | 主板的基本概念、QOM 关系、创建流程和板级示例。 |
| SoC 建模 | 外设建模流程 | [讲义](https://qemu.gevico.online/tutorial/2026/ch2/qemu-hw/) | [11:52](https://www.bilibili.com/video/BV1Ae9wBjEiD/) | 类型注册、状态结构、实例与类初始化、MMIO、FIFO 和中断。 |
| SoC 建模 | 时钟系统 | [讲义](https://qemu.gevico.online/tutorial/2026/ch2/qemu-clock/) | [13:09](https://www.bilibili.com/video/BV1p99cBCEzV/) | 时钟类型、定时器、主循环、设备钟和状态迁移。 |
| GPGPU 建模 | GPGPU 原理 | [讲义](https://qemu.gevico.online/tutorial/2026/ch2/qemu-gpgpu/) | — | 执行模型、内存层次、执行流程、多节点互联和 ASIC 加速。 |
| GPGPU 建模 | PCIe 模拟方法 | [讲义](https://qemu.gevico.online/tutorial/2026/ch2/qemu-pcie/) | — | RC/EP 模式、iATU 机制、配置空间和 BAR 映射。 |
| GPGPU 建模 | kernel 运行机制 | [讲义](https://qemu.gevico.online/tutorial/2026/ch2/qemu-gpgpu-kernel/) | — | kernel 下发与执行流程、调度要点、QEMU 中的算子处理。 |
| Rust 建模 | Rust FFI 介绍 | [讲义](https://qemu.gevico.online/tutorial/2026/ch2/qemu-rust-ffi/) | — | FFI 分层、绑定生成、构建协作、Rust 调用 C 和 C 回调 Rust。 |
| Rust 建模 | Rust 建模流程 | [讲义](https://qemu.gevico.online/tutorial/2026/ch2/qemu-rust-model/) | — | QOM 实现、MemoryRegion 实现、I2C、GPIO 和 SysBus 封装。 |
| Rust 建模 | Rust 测题开发 | [讲义](https://qemu.gevico.online/tutorial/2026/ch2/qemu-rust-test/) | — | 测试入口、写法模式、设备侧测试和常见问题。 |

配套实验提供四个方向，选择一个完成：

- [专业阶段实验总览](https://qemu.gevico.online/exercise/2026/stage2/)
- [CPU 建模实验](https://qemu.gevico.online/exercise/2026/stage2/cpu/)
- [SoC 建模实验](https://qemu.gevico.online/exercise/2026/stage2/soc/)
- [GPGPU 建模实验](https://qemu.gevico.online/exercise/2026/stage2/gpu/)
- [Rust 建模实验](https://qemu.gevico.online/exercise/2026/stage2/rust/)

Rust 方向可以先看往期的 [Rust 建模讲解：PL011 外设](https://www.bilibili.com/video/BV1xqspzXEuT/) 和 [Rust In QEMU](https://www.bilibili.com/video/BV15FPQezESY/)，再阅读当前讲义并核对代码。

## 项目阶段

项目阶段用六周时间围绕四个方向开展小组实践。每个方向先阅读背景讲义，再进入对应的项目任务页；任务要求、协作方式和考核标准以任务页为准。

| 方向 | 讲义 | 任务 | 学习内容 |
| --- | --- | --- | --- |
| 数字星务计算机 | [讲义](https://qemu.gevico.online/tutorial/2026/ch3/qemu-k230/) | [任务](https://qemu.gevico.online/exercise/2026/stage3/qemu-k230/) | QEMU `k230` machine 基线、启动链路、外设建模和邮件列表协作；任务包括 RustSBI 适配、外设补全和星务安全模块仿真。 |
| 建模 AI 加速卡 | [讲义](https://qemu.gevico.online/tutorial/2026/ch3/qemu-cxlemu/) | [任务](https://qemu.gevico.online/exercise/2026/stage3/qemu-cxlemu/) | CXL Type-2 加速器、CXLMemSim、hetGPU 和 ternary 推理链路；Guest CUDA 调用经 libcuda shim 转换为 CXL 命令。 |
| 大模型建模外设 | [讲义](https://qemu.gevico.online/tutorial/2026/ch3/qemu-agent/) | [任务](https://qemu.gevico.online/exercise/2026/stage3/qemu-agent/) | 以参考手册、datasheet 和驱动代码为输入，抽取寄存器、推断行为、生成中断模型，并用固件、驱动回放或单元测试验证。 |
| 应用跨平台转译 | [讲义](https://qemu.gevico.online/tutorial/2026/ch3/qemu-wine-ce/) | [任务](https://qemu.gevico.online/exercise/2026/stage3/qemu-wine-ce/) | Wine 兼容层、QEMU/Box64 动态翻译与宿主系统的协作；任务包括版本升级、应用测评和 RISC-V 支持完善。 |

项目选题会介绍了四个方向的背景、任务和协作方式：

| 视频 | 时长 | 学习内容 |
| --- | --- | --- |
| [项目阶段 四大项目方向 项目选题会](https://www.bilibili.com/video/BV13YTm6rEGf/) | 49:04 | 四个项目方向的研究背景、任务拆分、导师与助教安排。 |

## 结营

2026 年 8 月 9 日举行结营仪式，展示 K230 全链路启动适配、CXL AI 加速卡建模等项目成果，并复盘训练营的运营与下一期规划。

| 视频 | 时长 | 学习内容 |
| --- | --- | --- |
| [结营仪式 ｜ QEMU 训练营 2026](https://www.bilibili.com/video/BV1UEuS62EqY/) | 1:12:16 | 项目成果展示、运营复盘和下一期建设方向。 |

## 训练营公开活动与专题分享

以下视频来自开营、筹备和专题分享，不属于四个阶段的固定课程，可以按兴趣选看。

| 视频 | 时长 | 学习内容 |
| --- | --- | --- |
| [2026 筹备启动讨论会](https://www.bilibili.com/video/BV1CjFkzrEhD/) | 25:50 | 介绍 2026 年课程升级、实验方向和项目安排。 |
| [2026 在线讲义，全新升级](https://www.bilibili.com/video/BV151FxzmEYq/) | 6:51 | 讲义站点的内容组织、检索和更新方式。 |
| [从零开始的 GPGPU 模拟器与 LLM 自动化建模](https://www.bilibili.com/video/BV1NkSSBrEqM/) | 1:50:32 | 开营主题分享，介绍 GPGPU 建模和大模型辅助建模方向。 |
| [2026 年课程内容介绍](https://www.bilibili.com/video/BV1CSSQByEDB/) | 13:58 | 四个阶段、六个实验和四个项目的课程安排。 |
| [甲辰计划：这是最坏的时代，这是最好的时代](https://www.bilibili.com/video/BV1M6SQBDEpg/) | 15:23 | RISC-V 生态、人才培养计划和社区参与方式。 |
| [主办方华科开放原子开源俱乐部介绍](https://www.bilibili.com/video/BV1ASSQByE4Q/) | 8:18 | 俱乐部的开源项目、镜像站和社区活动。 |
| [数字星务计算机项目与 RustSBI 介绍](https://www.bilibili.com/video/BV1PUSQBLEkW/) | 16:59 | K230 星务计算项目背景和 RustSBI 的作用。 |
| [Box64 在龙架构上的 x86 兼容性实践](https://www.bilibili.com/video/BV1yUSQBLEPj/) | 18:44 | LoongArch 上运行 x86 应用的翻译与兼容实践。 |
| [讲解 QEMU RISC-V Sdext 实现思路](https://www.bilibili.com/video/BV1kEFkzgEM5/) | 26:38 | RISC-V Sdext 扩展的模拟实现和代码路径。 |
| [超详细干货分享，手把手教你基于 QEMU 调试 Linux 内核](https://www.bilibili.com/video/BV14NAPzjEPW/) | 49:50 | 使用 QEMU 和 GDB 调试客户机内核。 |
| [从零 Vibe 龙虾之“工作台” — 搭建你的 Agent 开发环境](https://www.bilibili.com/video/BV1rpAMznESa/) | 16:02 | 准备 Agent 开发环境和常用工具。 |
| [从零 Vibe 龙虾之“对话” — 如何驱动 Agent 做设计和编码](https://www.bilibili.com/video/BV1eZATzqET4/) | 17:05 | 用对话驱动 Agent 完成设计和编码。 |
| [从零 Vibe 龙虾之“流水线” — 用 Agent 跑大型重构和自动化](https://www.bilibili.com/video/BV1MRAgzTECw/) | 19:22 | 用 Agent 组织重构、批量修改和自动化任务。 |
| [源来喻见你 ｜ 基于 Agent 范式 x 多人协作的系统软件开发介绍](https://www.bilibili.com/video/BV1LYDDBhEiq/) | 28:03 | Agent 范式下的多人协作和系统软件开发流程。 |

## 往期课程

合集还收录 2024 和 2025 年训练营的课程录像、项目周会和社区分享。下面列出与当前课程关系较密切的讲座，完整列表见 B 站合集；项目周会记录的是当时的具体项目进展，按需查阅。

### 早期训练营讲座

| 课程 | 时长 | 学习内容 |
| --- | --- | --- |
| [分享给 QEMU 社区贡献补丁的经过](https://www.bilibili.com/video/BV1DRqXYiEs2/) | 9:52 | 从发现问题到发送补丁、参与评审的完整过程。 |
| [如何从邮件列表拉取补丁 apply 到本地源码仓库](https://www.bilibili.com/video/BV16pBEYsE7x/) | 15:33 | 查找邮件、下载补丁、使用 `git am` 应用到本地分支。 |
| [提交补丁：修复 vext_vv_rm_2 函数没有正确检查 VSTART 寄存器的问题](https://www.bilibili.com/video/BV1KbkHYQEm1/) | 5:12 | 定位 RISC-V 向量指令模拟中的寄存器检查问题并提交修复。 |
| [更新补丁：重构 QEMU 的 VSTART_CHECK_EARLY_EXIT()](https://www.bilibili.com/video/BV15EkZYNEUq/) | 7:57 | 按评审意见修改补丁并重新发送。 |
| [专业阶段 QEMU 原理前言介绍](https://www.bilibili.com/video/BV1PmSEYtETA/) | 0:37 | 专业阶段的课程目标和内容概览。 |
| [浅析 QEMU 的 QOM 实现](https://www.bilibili.com/video/BV13FrxYNEND/) | 33:21 | QOM 的类型注册、对象构造和属性系统实现。 |
| [TCG 基本原理分析](https://www.bilibili.com/video/BV1qcSJYmEMj/) | 18:54 | 动态二进制翻译的基本原理和 TCG 的执行框架。 |
| [TCG 的 code_buffer 初始化流程与内存布局](https://www.bilibili.com/video/BV1udDWYnEYf/) | 51:18 | `code_buffer` 的初始化、内存布局和翻译代码写入。 |
| [Decodetree 语法分析与示例介绍](https://www.bilibili.com/video/BV1zvU3YbEsa/) | 27:14 | Decodetree 的语法、生成过程和指令译码示例。 |
| [添加自定义的 RISC-V 指令](https://www.bilibili.com/video/BV1nUmoYWEMh/) | 16:31 | 从译码表到翻译函数增加一条自定义指令。 |
| [TCG 翻译执行流程 cpu_exec_loop()](https://www.bilibili.com/video/BV1pqqpYqEc8/) | 11:52 | `cpu_exec_loop()` 的翻译、执行和退出流程。 |
| [分析 registerfileds 语法糖](https://www.bilibili.com/video/BV1hGqTYBEwL/) | 13:35 | `registerfields` 宏生成的字段访问代码。 |
| [分析 tb_gen_code() 函数](https://www.bilibili.com/video/BV1tTqvY1E9G/) | 26:43 | 翻译块生成函数的执行路径和关键数据结构。 |

### 2025 年讲座

| 课程 | 时长 | 学习内容 |
| --- | --- | --- |
| [从 “模拟红白机” 到 “云虚拟机”！40 年技术进化史](https://www.bilibili.com/video/BV1sk4UzAERR/) | 1:39:07 | 虚拟化技术四十年的演进和典型应用。 |
| [基础阶段 C 习题 20 道系统讲解与答疑，夯实基础](https://www.bilibili.com/video/BV1a6WizNE9R/) | 59:36 | 通过 20 道 C 习题复习指针、结构体、内存和位操作。 |
| [硬件虚拟化技术科普：应用场景、基本原理](https://www.bilibili.com/video/BV1hYWnz9EXa/) | 1:07:19 | 硬件虚拟化的应用场景、特权级和地址转换原理。 |
| [吃透 QEMU 不用愁！这两个核心概念先码住](https://www.bilibili.com/video/BV1H3sPzZEnP/) | 1:11:14 | QOM 面向对象建模和 MemoryRegion 地址空间抽象。 |
| [QEMU 初始化流程分析：virt Machine 初始化以及客户机加载流程](https://www.bilibili.com/video/BV1hoWyzxEQm/) | 55:08 | virt machine 初始化、客户机加载和 vCPU 启动。 |
| [QEMU accelerator 介绍：TCG（主）、KVM](https://www.bilibili.com/video/BV1nPsazTEbC/) | 1:01:18 | TCG 与 KVM 两类加速器的分工和运行方式。 |
| [QEMU Rust 建模讲解：PL011 外设](https://www.bilibili.com/video/BV1xqspzXEuT/) | 30:14 | 用 Rust 实现 PL011 串口设备模型。 |
| [专业阶段实验讲解：板卡建模与 CPU 指令模拟](https://www.bilibili.com/video/BV1fLsfzCEm9/) | 27:12 | 板卡建模和 CPU 指令模拟的实验步骤。 |
| [专业阶段实验讲解：SPI 外设建模](https://www.bilibili.com/video/BV1zLsfzCEHe/) | 47:05 | SPI 控制器和外设的实验步骤。 |
| [QEMU 调试工具介绍：gdbstub / log / trace event](https://www.bilibili.com/video/BV1dnsmz6E65/) | 33:18 | gdbstub、日志和 trace event 的使用方法。 |
| [JIT 实现方案与常见的体系结构无关的优化浅析](https://www.bilibili.com/video/BV1cNL9zCEvL/) | 30:16 | JIT 的实现方案和体系结构无关的优化。 |
| [收藏！QEMU 虚拟化技术最佳实践全攻略](https://www.bilibili.com/video/BV1c41gByEPM/) | 43:44 | QEMU 虚拟化的常用配置、性能和实践经验。 |

往期讲座均早于 2026 年课程，QEMU 代码和实验接口已有变化。阅读 TCG、QOM 等实现分析时，先确认所使用版本的源码，再对照视频中的函数和数据结构。

## 学习记录与参与任务

每完成一个阶段，记录使用的 QEMU 版本、目标架构、构建参数、客户机镜像、操作步骤、实际输出，以及仍未理解的问题。尝试用自己的语言说明 QOM、MemoryRegion、TCG 翻译块和中断注入的工作过程，并能从构建或运行日志中说明遇到的问题。

开始参与前，按[参与者注册说明](../../participants/README.md)完成注册。随后按[贡献指南中的申领流程](../../CONTRIBUTING.md#申领任务)选择任务，在原 Issue 中说明准备情况、学习记录和需要的指导。训练营课程可以作为任务准备材料，MFCP 任务的范围和验收条件以对应 Issue 为准。

QEMU 项目接受 `processmission/qemu` 仓库的 Pull Request，也记录通过 `qemu-devel` 邮件列表评审的上游补丁。提交成果前阅读 [QEMU 项目说明](README.md)中的贡献与评审要求。

## 来源与更新

课程结构、讲义链接和实验安排来自 [QEMU 训练营 2026 讲义](https://qemu.gevico.online/tutorial/2026/)及其[公开源码仓库](https://github.com/qemu-camp/qemu-camp-tutorial)；课程时间、规模和授权信息来自[报名公告](https://qemu.gevico.online/news/2026/qemu-camp-update-2026-03-17/)与[结营报道](https://qemu.gevico.online/news/2026/qemu-camp-closing-2026-08-09/)。视频标题、时长和发布日期来自 [B 站合集](https://space.bilibili.com/483048140/lists/6542936?type=season)及其[公开接口](https://api.bilibili.com/x/polymer/web-space/seasons_archives_list?mid=483048140&season_id=6542936&sort_reverse=false&page_num=1&page_size=100)。

更新本页时，核对讲义路径、实验入口、视频 BV 号、时长和课程阶段划分，并更新核对日期。视频内容的授权以原页面为准。
