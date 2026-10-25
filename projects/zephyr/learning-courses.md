<!-- SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission -->
<!-- SPDX-License-Identifier: MIT -->

# Zephyr RTOS 学习课程

## Agent 使用与披露

> [!IMPORTANT]
> **建议准备参与上游贡献的同学优先学习第 8 章，依次观看 8.1、8.2、8.3。** 使用 Agent 编写代码、文档或分析材料前，先了解人工审查责任、使用披露和提交要求，再按任务需要学习其他章节。

| 优先学习 | 时长 | 学习重点 |
| --- | --- | --- |
| [8.1 Zephyr 社区的 AI 贡献准则](https://www.bilibili.com/video/BV16vHN6gECR/) | 16:07 | 理解人类提交者对生成内容的审查、许可证核查与 DCO 签署责任。 |
| [8.2 Zephyr Assisted-by 标签与溯源规范](https://www.bilibili.com/video/BV1XiHM6KERT/) | 11:19 | 学习如何记录使用的 Agent、模型版本和辅助工具，向评审者披露 AI 参与情况。 |
| [8.3 Zephyr Agent 开发的设计与审查策略](https://www.bilibili.com/video/BV1uMnS6CEsR/) | 31:15 | 学习在编写代码前明确设计与修改范围，形成架构决策记录（ADR），由人工审查后开始实现。 |

向 Zephyr 提交贡献时，同时阅读官方 [AI Coding Assistants 准则](https://docs.zephyrproject.org/latest/contribute/guidelines.html#ai-coding-assistants)和[使用披露说明](https://docs.zephyrproject.org/latest/contribute/guidelines.html#usage-disclosure-and-attribution)。人类提交者需要理解并审查修改、检查许可证、完成验证和 DCO 签署；官方建议通过 `Assisted-by` 记录 AI 辅助情况。具体格式与要求以提交时的上游指南为准。

第 8.3 节介绍设计与审查的实践方法。其他上游项目的任务，请同时核对目标仓库自己的贡献指南，按该项目规定准备使用披露和提交材料。

## 课程介绍

初次接触 Zephyr 的贡献者可以从这份课程目录开始，先建立开发环境、构建流程和系统基本概念，再结合任务学习设备模型、线程与驱动。

- **课程**：[Zephyr RTOS：AI Agent 原生开发教程](https://www.bilibili.com/video/BV1khpe6bErD/)
- **作者**：[绝对是泽文啦](https://space.bilibili.com/483048140)
- **语言**：中文。
- **目录核对日期**：2026 年 10 月 25 日。
- **当前内容**：26 个分 P，按课程编号分为 8 个章节，总时长 **7 小时 33 分 54 秒**。社区活动视频单独列在后文。

课程从 Zephyr 的开发工具与环境入手，逐步讲解 Kconfig、CMake、Devicetree、设备模型、线程调度、同步机制和驱动接口，第 8 章介绍 Agent 辅助开发中的贡献准则、使用披露和人工审查。学习时可以围绕“配置怎样生效、硬件怎样描述、设备怎样初始化、线程怎样运行”逐步建立理解。

作者将课程定位为面向有嵌入式经验开发者的深入学习资料。Zephyr 零基础的同学可以按下面的顺序学习；尚未接触 C 语言和开发工具的同学，先准备好基础知识，再进入具体章节。课程持续更新，本页仅收录核对时已经发布的内容，章节简介依据作者公开的单集介绍整理。

## 开始前的准备

- 能阅读简单 C 程序，认识函数、指针、结构体、宏和头文件。
- 能使用终端切换目录、执行命令，了解 Git 获取源码和查看修改的基本操作。
- 了解编译、链接和程序运行的基本过程。
- 准备可使用的开发环境，记录操作系统、Zephyr 版本及工具版本。

学习资料提供中英文两个入口：

| 资料 | 中文 | English |
| --- | --- | --- |
| Zephyr 文档首页 | [进程使命中文文档](https://processmission.github.io/zephyr/) | [Zephyr 官方文档](https://docs.zephyrproject.org/) |
| 环境安装与第一个示例 | [中文入门指南](https://processmission.github.io/zephyr/develop/getting_started/index.html) | [Getting Started Guide](https://docs.zephyrproject.org/latest/develop/getting_started/index.html) |

中文译文由进程使命维护，页面右上角的 English 可打开对应原文；尚未翻译的页面和生成参考资料链接到上游英文站。可以先按中文入门指南准备环境，并核对自己使用的 Zephyr 版本。视频、译文和当前上游内容可能存在版本差异，实际配置与技术细节以对应版本的英文原文为准。

基础运行练习可以使用 [Hello World 的 QEMU 示例](https://docs.zephyrproject.org/latest/samples/hello_world/README.html)。QEMU 可用于在电脑上运行基础应用和部分内核测试；课程中的开发板烧录、调试器连接和真实外设操作需要相应硬件。有关仿真平台能力，参考 [QEMU x86 板级说明](https://docs.zephyrproject.org/latest/boards/qemu/x86/doc/index.html)。

## 建议学习顺序

| 阶段 | 章节 | 学习目标与实践 |
| --- | --- | --- |
| 准备上游贡献与 Agent 辅助开发 | 第 8 章 | 优先了解人工审查、DCO 与使用披露，阅读目标仓库的贡献指南，明确设计范围和验证安排。 |
| 认识 Zephyr 并运行程序 | 第 1 章 | 理解工具分工，准备环境，获取源码并运行 Hello World；记录实际构建与运行结果。 |
| 理解配置与硬件描述 | 第 2、3 章 | 阅读应用配置、构建文件和设备树，能够查找配置来源及构建生成文件。 |
| 理解设备与线程 | 第 4、5 章 | 跟踪设备初始化过程，理解线程状态、优先级及线程内存安排。 |
| 理解同步与驱动接口 | 第 6、7 章 | 分析互斥量和信号量的使用场景，理解通用 API 与具体驱动的连接方式。 |

完成第 1 章的环境准备与运行练习后，可以结合想参与的 Issue 选择后续技术章节。例如，构建与配置问题先学习第 2 章，设备描述和驱动问题学习第 3、4、7 章，线程与同步问题学习第 5、6 章。

## 全部章节与学习链接

点击课程标题即可进入合集对应的分 P。本目录按课程编号列出 26 节课程，链接与时长采用核对时的分 P 信息。

### 第 1 章：课程导学与开发环境

| 编号与课程 | 时长 | 学习内容 |
| --- | --- | --- |
| [1.0 Zephyr 系统学习与 Agent 原生开发](https://www.bilibili.com/video/BV1khpe6bErD/?p=1) | 16:21 | 了解课程安排、系统学习与实践的关系，以及使用 Agent 辅助开发时需要保留的分析能力。 |
| [1.1 RTOS 的代际演进：为什么选择 Zephyr](https://www.bilibili.com/video/BV1khpe6bErD/?p=2) | 19:10 | 认识 Zephyr 的架构特点，以及其组织硬件支持和复用代码的方式。 |
| [1.2 Zephyr 开发核心角色：West 工具链的权力地图](https://www.bilibili.com/video/BV1khpe6bErD/?p=3) | 20:24 | 理解 west 在多仓库管理、构建和调试中的职责。 |
| [1.3 Zephyr SDK：本地依赖与 Python 环境隔离策略](https://www.bilibili.com/video/BV1khpe6bErD/?p=4) | 19:19 | 学习环境依赖与 Python 虚拟环境的配置方法，认识版本冲突的处理思路。 |
| [1.4 west 介绍：从 Manifest 到代码同步](https://www.bilibili.com/video/BV1khpe6bErD/?p=5) | 12:55 | 理解 Manifest 与工作目录的关系，学习初始化和同步 Zephyr 源码。 |
| [1.5 Zephyr 构建全流程：从源代码到 Binary](https://www.bilibili.com/video/BV1khpe6bErD/?p=6) | 17:03 | 了解 west build、目标板选择和构建输出，建立从源码到固件的基本认识。 |
| [1.6 Zephyr 烧录与交互：验证你的第一个固件](https://www.bilibili.com/video/BV1khpe6bErD/?p=7) | 18:02 | 学习通过调试器烧录固件、观察日志，并用实际运行结果验证修改。 |

### 第 2 章：Kconfig 与构建系统

| 编号与课程 | 时长 | 学习内容 |
| --- | --- | --- |
| [2.1 Kconfig 语法基础与符号类型](https://www.bilibili.com/video/BV1khpe6bErD/?p=8) | 10:08 | 阅读配置符号、类型和依赖关系，为理解和增加配置选项做准备。 |
| [2.2 Zephyr Kconfig 的层级结构与覆盖逻辑](https://www.bilibili.com/video/BV1khpe6bErD/?p=9) | 12:19 | 了解 SoC、板卡和应用配置的组织方式，学习查找配置项最终生效的位置。 |
| [2.3 Zephyr CMake 构建系统的启动流程](https://www.bilibili.com/video/BV1khpe6bErD/?p=10) | 07:19 | 理解 CMakeLists.txt、Zephyr 构建入口与 west 调用之间的关系。 |
| [2.4 Zephyr 元编程思想：动态代码生成与生成文件分析](https://www.bilibili.com/video/BV1khpe6bErD/?p=11) | 11:52 | 认识构建过程中生成的头文件和设备树宏，学习从构建目录查找中间产物。 |

### 第 3 章：Devicetree 硬件描述

| 编号与课程 | 时长 | 学习内容 |
| --- | --- | --- |
| [3.1 Devicetree 的层级逻辑与节点构造](https://www.bilibili.com/video/BV1khpe6bErD/?p=12) | 17:15 | 阅读 DTS 中的根节点、子节点和标签，理解硬件的树状组织方式。 |
| [3.2 Devicetree 标准属性与数据类型解析](https://www.bilibili.com/video/BV1khpe6bErD/?p=13) | 12:15 | 认识 compatible、reg、interrupts 等属性及其描述的设备信息。 |
| [3.3 Zephyr DTS Binding 约束文件的结构与语法](https://www.bilibili.com/video/BV1khpe6bErD/?p=14) | 13:43 | 阅读和编写 YAML Binding 文件，理解必填属性及硬件配置约束，为自定义驱动提供设备树支持。 |

### 第 4 章：设备模型与初始化

| 编号与课程 | 时长 | 学习内容 |
| --- | --- | --- |
| [4.1 Zephyr 驱动程序的骨架：device 结构体的内存布局](https://www.bilibili.com/video/BV1khpe6bErD/?p=16) | 16:28 | 理解设备对象中的配置、API 接口和运行时数据如何组织。 |
| [4.2 Zephyr DEVICE_DEFINE 宏背后的链接器魔法](https://www.bilibili.com/video/BV1khpe6bErD/?p=15) | 11:47 | 了解设备定义如何进入链接器指定区域，以及系统怎样收集设备实例。 |
| [4.3 Zephyr 驱动初始化等级：从 EARLIEST 到 APPLICATION](https://www.bilibili.com/video/BV1khpe6bErD/?p=17) | 21:36 | 学习初始化等级、驱动依赖与内核服务可用时机之间的关系。 |

### 第 5 章：线程与调度

| 编号与课程 | 时长 | 学习内容 |
| --- | --- | --- |
| [5.1 Zephyr 线程生命周期与状态转换机](https://www.bilibili.com/video/BV1khpe6bErD/?p=18) | 12:49 | 理解线程创建、就绪、运行和终止，以及挂起、延时等操作引起的状态变化。 |
| [5.2 Zephyr 线程优先级体系：协作式 vs 抢占式线程](https://www.bilibili.com/video/BV1khpe6bErD/?p=19) | 13:01 | 学习两类线程的调度规则，理解优先级选择对多任务运行的影响。 |
| [5.3 Zephyr 线程 Stack 定义与溢出检测机制](https://www.bilibili.com/video/BV1khpe6bErD/?p=20) | 33:41 | 了解 K_THREAD_STACK_DEFINE、线程内存分配和溢出保护，建立定位相关 HardFault 的思路。 |

### 第 6 章：线程同步

| 编号与课程 | 时长 | 学习内容 |
| --- | --- | --- |
| [6.1 Zephyr 互斥量 (Mutex) 的工作原理与优先级继承](https://www.bilibili.com/video/BV1khpe6bErD/?p=21) | 25:40 | 理解共享资源保护、竞态条件与优先级继承。 |
| [6.2 Zephyr 信号量 (Semaphore) 的同步逻辑](https://www.bilibili.com/video/BV1khpe6bErD/?p=22) | 32:10 | 认识计数与二进制信号量，理解任务间同步及生产者与消费者的协作方式。 |

### 第 7 章：驱动接口

| 编号与课程 | 时长 | 学习内容 |
| --- | --- | --- |
| [7.1 Zephyr 驱动 API 结构体：硬件无关的契约抽象](https://www.bilibili.com/video/BV1khpe6bErD/?p=23) | 19:56 | 理解驱动 API 结构体怎样连接通用子系统与具体硬件实现。 |

### 第 8 章：Agent 辅助开发与上游贡献

| 编号与课程 | 时长 | 学习内容 |
| --- | --- | --- |
| [8.1 Zephyr 社区的 AI 贡献准则](https://www.bilibili.com/video/BV1khpe6bErD/?p=24) | 16:07 | 结合 Contribution Guidelines，理解人工审查、许可证核查和 DCO 签署责任。 |
| [8.2 Zephyr Assisted-by 标签与溯源规范](https://www.bilibili.com/video/BV1khpe6bErD/?p=25) | 11:19 | 学习使用 Assisted-by 记录 Agent、模型版本与辅助工具，提供评审所需的使用披露。 |
| [8.3 Zephyr Agent 开发的设计与审查策略](https://www.bilibili.com/video/BV1khpe6bErD/?p=26) | 31:15 | 学习在实现前形成架构决策记录，由人工审查设计与修改范围，避免增加未经确认的功能。 |

## 社区活动资料

| 视频 | 发布日期 | 时长 | 内容 |
| --- | --- | --- | --- |
| [MFCP 开源实践计划之 Zephyr 介绍](https://www.bilibili.com/video/BV1kmn865EBQ/) | 2026-10-23 | 39:18 | 介绍通过开源学习、导师指导、真实项目实践和贡献评估参与 MFCP 的方式。 |

## 学习记录与参与任务

每完成一个阶段，记录使用的 Zephyr 版本、目标平台、操作步骤、实际输出，以及仍未理解的问题。尝试用自己的语言说明 west、SDK、Kconfig、CMake 和 Devicetree 的作用，并能从构建或运行日志中描述遇到的问题。

开始参与前，按[参与者注册说明](../../participants/README.md)完成注册。随后按[贡献指南中的申领流程](../../CONTRIBUTING.md#申领任务)选择任务，在原 Issue 中说明准备情况、学习记录和需要的指导。课程笔记可以帮助沟通，任务成果按对应验收条件提交。

## 来源与更新

目录与单集介绍来自 [B 站课程页面](https://www.bilibili.com/video/BV1khpe6bErD/)及其[公开课程信息](https://api.bilibili.com/x/web-interface/view?bvid=BV1khpe6bErD)。第 3.3 节发布于 2026 年 10 月 24 日，第 8.1、8.2 节发布于 10 月 24 日，第 8.3 节发布于 10 月 25 日，发布日期按北京时间记录。章节简介依据作者公开的单集介绍整理，上游规则提示依据链接的官方贡献指南。

更新本页时，核对分 P 编号、课程标题链接和时长，并更新核对日期。视频内容的授权以原页面为准。
