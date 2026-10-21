<!-- SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission -->
<!-- SPDX-License-Identifier: MIT -->

# Zephyr RTOS 学习课程

初次接触 Zephyr 的贡献者可以从这份课程目录开始，先建立开发环境、构建流程和系统基本概念，再结合任务学习设备模型、线程与驱动。

## 课程介绍

- **课程**：[Zephyr RTOS 开发实践](https://www.bilibili.com/video/BV1khpe6bErD/)
- **作者**：[绝对是泽文啦](https://space.bilibili.com/483048140)
- **语言**：中文。
- **目录核对日期**：2026 年 10 月 21 日。
- **当前内容**：22 个分 P，按课程编号分为 7 个章节，总时长 **6 小时 21 分 30 秒**。

课程从 Zephyr 的开发工具与环境入手，逐步讲解 Kconfig、CMake、Devicetree、设备模型、线程调度、同步机制和驱动接口。作者将系统性学习与实际开发经验结合，并在导学中介绍使用 Agent 辅助开发的思路。学习时可以围绕“配置怎样生效、硬件怎样描述、设备怎样初始化、线程怎样运行”逐步建立理解。

作者将课程定位为面向有嵌入式经验开发者的深入学习资料。Zephyr 零基础的同学可以按下面的顺序学习；尚未接触 C 语言和开发工具的同学，先准备好基础知识，再进入具体章节。课程持续更新，本页仅收录核对时已经发布的内容，章节简介依据作者公开的单集介绍整理。

## 开始前的准备

- 能阅读简单 C 程序，认识函数、指针、结构体、宏和头文件。
- 能使用终端切换目录、执行命令，了解 Git 获取源码和查看修改的基本操作。
- 了解编译、链接和程序运行的基本过程。
- 准备可使用的开发环境，记录操作系统、Zephyr 版本及工具版本。

环境安装步骤参考 [Zephyr 官方入门指南](https://docs.zephyrproject.org/latest/develop/getting_started/index.html)。视频中的工具版本与当前版本可能不同，实际配置以所使用版本的官方文档为准。

基础运行练习可以使用 [Hello World 的 QEMU 示例](https://docs.zephyrproject.org/latest/samples/hello_world/README.html)。QEMU 可用于在电脑上运行基础应用和部分内核测试；课程中的开发板烧录、调试器连接和真实外设操作需要相应硬件。有关仿真平台能力，参考 [QEMU x86 板级说明](https://docs.zephyrproject.org/latest/boards/qemu/x86/doc/index.html)。

## 建议学习顺序

| 阶段 | 章节 | 学习目标与实践 |
| --- | --- | --- |
| 认识 Zephyr 并运行程序 | 第 1 章 | 理解工具分工，准备环境，获取源码并运行 Hello World；记录实际构建与运行结果。 |
| 理解配置与硬件描述 | 第 2、3 章 | 阅读应用配置、构建文件和设备树，能够查找配置来源及构建生成文件。 |
| 理解设备与线程 | 第 4、5 章 | 跟踪设备初始化过程，理解线程状态、优先级及线程内存安排。 |
| 理解同步与驱动接口 | 第 6、7 章 | 分析互斥量和信号量的使用场景，理解通用 API 与具体驱动的连接方式。 |

完成第 1 阶段后，可以结合想参与的 Issue 选择后续章节。例如，构建与配置问题先学习第 2 章，设备描述和驱动问题学习第 3、4、7 章，线程与同步问题学习第 5、6 章。

## 全部章节与学习链接

“分 P”链接直接进入用户提供的合集对应位置；“单集”链接进入同编号的独立视频，便于收藏和查看讨论。合集还包含一个聚合视频入口，本目录按 22 节课程分别列出。时长统一采用分 P 版本，编号保留课程现有顺序。

### 第 1 章：课程导学与开发环境

| 编号与课程 | 时长 | 学习内容 | 学习链接 |
| --- | --- | --- | --- |
| 1.0 Zephyr 系统学习与 Agent 原生开发 | 16:21 | 了解课程安排、系统学习与实践的关系，以及使用 Agent 辅助开发时需要保留的分析能力。 | [分 P 1](https://www.bilibili.com/video/BV1khpe6bErD/?p=1) · [单集](https://www.bilibili.com/video/BV132JR6FEYx/) |
| 1.1 RTOS 的代际演进：为什么选择 Zephyr | 19:10 | 认识 Zephyr 的架构特点，以及其组织硬件支持和复用代码的方式。 | [分 P 2](https://www.bilibili.com/video/BV1khpe6bErD/?p=2) · [单集](https://www.bilibili.com/video/BV16QHi6fEYt/) |
| 1.2 Zephyr 开发核心角色：West 工具链的权力地图 | 20:24 | 理解 west 在多仓库管理、构建和调试中的职责。 | [分 P 3](https://www.bilibili.com/video/BV1khpe6bErD/?p=3) · [单集](https://www.bilibili.com/video/BV1tpHz6jEn9/) |
| 1.3 Zephyr SDK：本地依赖与 Python 环境隔离策略 | 19:19 | 学习环境依赖与 Python 虚拟环境的配置方法，认识版本冲突的处理思路。 | [分 P 4](https://www.bilibili.com/video/BV1khpe6bErD/?p=4) · [单集](https://www.bilibili.com/video/BV1i5Hp6mE1f/) |
| 1.4 west 介绍：从 Manifest 到代码同步 | 12:55 | 理解 Manifest 与工作目录的关系，学习初始化和同步 Zephyr 源码。 | [分 P 5](https://www.bilibili.com/video/BV1khpe6bErD/?p=5) · [单集](https://www.bilibili.com/video/BV1g8Hs6LEUg/) |
| 1.5 Zephyr 构建全流程：从源代码到 Binary | 17:03 | 了解 west build、目标板选择和构建输出，建立从源码到固件的基本认识。 | [分 P 6](https://www.bilibili.com/video/BV1khpe6bErD/?p=6) · [单集](https://www.bilibili.com/video/BV1KfHW6qE4t/) |
| 1.6 Zephyr 烧录与交互：验证你的第一个固件 | 18:02 | 学习通过调试器烧录固件、观察日志，并用实际运行结果验证修改。 | [分 P 7](https://www.bilibili.com/video/BV1khpe6bErD/?p=7) · [单集](https://www.bilibili.com/video/BV1NDpA6LEaX/) |

### 第 2 章：Kconfig 与构建系统

| 编号与课程 | 时长 | 学习内容 | 学习链接 |
| --- | --- | --- | --- |
| 2.1 Kconfig 语法基础与符号类型 | 10:08 | 阅读配置符号、类型和依赖关系，为理解和增加配置选项做准备。 | [分 P 8](https://www.bilibili.com/video/BV1khpe6bErD/?p=8) · [单集](https://www.bilibili.com/video/BV18aph6wEXv/) |
| 2.2 Zephyr Kconfig 的层级结构与覆盖逻辑 | 12:19 | 了解 SoC、板卡和应用配置的组织方式，学习查找配置项最终生效的位置。 | [分 P 9](https://www.bilibili.com/video/BV1khpe6bErD/?p=9) · [单集](https://www.bilibili.com/video/BV1aSpu6gELE/) |
| 2.3 Zephyr CMake 构建系统的启动流程 | 07:19 | 理解 CMakeLists.txt、Zephyr 构建入口与 west 调用之间的关系。 | [分 P 10](https://www.bilibili.com/video/BV1khpe6bErD/?p=10) · [单集](https://www.bilibili.com/video/BV1mkpG6rEUM/) |
| 2.4 Zephyr 元编程思想：动态代码生成与生成文件分析 | 11:52 | 认识构建过程中生成的头文件和设备树宏，学习从构建目录查找中间产物。 | [分 P 11](https://www.bilibili.com/video/BV1khpe6bErD/?p=11) · [单集](https://www.bilibili.com/video/BV1AgpG6eER5/) |

### 第 3 章：Devicetree 硬件描述

| 编号与课程 | 时长 | 学习内容 | 学习链接 |
| --- | --- | --- | --- |
| 3.1 Devicetree 的层级逻辑与节点构造 | 17:15 | 阅读 DTS 中的根节点、子节点和标签，理解硬件的树状组织方式。 | [分 P 12](https://www.bilibili.com/video/BV1khpe6bErD/?p=12) · [单集](https://www.bilibili.com/video/BV1pSpd6dE6o/) |
| 3.2 Devicetree 标准属性与数据类型解析 | 12:15 | 认识 compatible、reg、interrupts 等属性及其描述的设备信息。 | [分 P 13](https://www.bilibili.com/video/BV1khpe6bErD/?p=13) · [单集](https://www.bilibili.com/video/BV1f7pd6mESu/) |

### 第 4 章：设备模型与初始化

| 编号与课程 | 时长 | 学习内容 | 学习链接 |
| --- | --- | --- | --- |
| 4.1 Zephyr 驱动程序的骨架：device 结构体的内存布局 | 16:28 | 理解设备对象中的配置、API 接口和运行时数据如何组织。 | [分 P 14](https://www.bilibili.com/video/BV1khpe6bErD/?p=14) · [单集](https://www.bilibili.com/video/BV1QDpR6KE2u/) |
| 4.2 Zephyr DEVICE_DEFINE 宏背后的链接器魔法 | 11:47 | 了解设备定义如何进入链接器指定区域，以及系统怎样收集设备实例。 | [分 P 15](https://www.bilibili.com/video/BV1khpe6bErD/?p=15) · [单集](https://www.bilibili.com/video/BV1Fopy6pEaf/) |
| 4.3 Zephyr 驱动初始化等级：从 EARLIEST 到 APPLICATION | 21:36 | 学习初始化等级、驱动依赖与内核服务可用时机之间的关系。 | [分 P 16](https://www.bilibili.com/video/BV1khpe6bErD/?p=16) · [单集](https://www.bilibili.com/video/BV1HBpm6wEgx/) |

### 第 5 章：线程与调度

| 编号与课程 | 时长 | 学习内容 | 学习链接 |
| --- | --- | --- | --- |
| 5.1 Zephyr 线程生命周期与状态转换机 | 12:49 | 理解线程创建、就绪、运行和终止，以及挂起、延时等操作引起的状态变化。 | [分 P 17](https://www.bilibili.com/video/BV1khpe6bErD/?p=17) · [单集](https://www.bilibili.com/video/BV15GHX6hEeS/) |
| 5.2 Zephyr 线程优先级体系：协作式 vs 抢占式线程 | 13:01 | 学习两类线程的调度规则，理解优先级选择对多任务运行的影响。 | [分 P 18](https://www.bilibili.com/video/BV1khpe6bErD/?p=18) · [单集](https://www.bilibili.com/video/BV19dHX6cEh9/) |
| 5.3 Zephyr 线程 Stack 定义与溢出检测机制 | 33:41 | 了解 K_THREAD_STACK_DEFINE、线程内存分配和溢出保护，建立定位相关 HardFault 的思路。 | [分 P 19](https://www.bilibili.com/video/BV1khpe6bErD/?p=19) · [单集](https://www.bilibili.com/video/BV1dCJi67Eem/) |

### 第 6 章：线程同步

| 编号与课程 | 时长 | 学习内容 | 学习链接 |
| --- | --- | --- | --- |
| 6.1 Zephyr 互斥量 (Mutex) 的工作原理与优先级继承 | 25:40 | 理解共享资源保护、竞态条件与优先级继承。 | [分 P 20](https://www.bilibili.com/video/BV1khpe6bErD/?p=20) · [单集](https://www.bilibili.com/video/BV1uaJy6ZEMQ/) |
| 6.2 Zephyr 信号量 (Semaphore) 的同步逻辑 | 32:10 | 认识计数与二进制信号量，理解任务间同步及生产者与消费者的协作方式。 | [分 P 21](https://www.bilibili.com/video/BV1khpe6bErD/?p=21) · [单集](https://www.bilibili.com/video/BV1xcJ26oEGM/) |

### 第 7 章：驱动接口

| 编号与课程 | 时长 | 学习内容 | 学习链接 |
| --- | --- | --- | --- |
| 7.1 Zephyr 驱动 API 结构体：硬件无关的契约抽象 | 19:56 | 理解驱动 API 结构体怎样连接通用子系统与具体硬件实现。 | [分 P 22](https://www.bilibili.com/video/BV1khpe6bErD/?p=22) · [单集](https://www.bilibili.com/video/BV1WJJR62E2v/) |

## 学习记录与参与任务

每完成一个阶段，记录使用的 Zephyr 版本、目标平台、操作步骤、实际输出，以及仍未理解的问题。尝试用自己的语言说明 west、SDK、Kconfig、CMake 和 Devicetree 的作用，并能从构建或运行日志中描述遇到的问题。

开始参与前，按[参与者注册说明](../../participants/README.md)完成注册。随后按[贡献指南中的申领流程](../../CONTRIBUTING.md#申领任务)选择任务，在原 Issue 中说明准备情况、学习记录和需要的指导。课程笔记可以帮助沟通，任务成果按对应验收条件提交。

## 来源与更新

目录与单集介绍来自 [B 站课程页面](https://www.bilibili.com/video/BV1khpe6bErD/)及其[公开课程信息](https://api.bilibili.com/x/web-interface/view?bvid=BV1khpe6bErD)。更新本页时，核对分 P 编号、单集链接和时长，并更新核对日期。视频内容的授权以原页面为准。
