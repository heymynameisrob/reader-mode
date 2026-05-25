# TypeScript-Go 非官方 NPM 包

[English Documentation](./README.md)

本包提供了 [Microsoft 的 TypeScript-Go](https://github.com/microsoft/typescript-go) 项目的非官方 NPM 发行版，该项目是 TypeScript 的基于 Go 的移植版本。

## ⚠️ 重要提示

这**不是**来自 TypeScript 团队的官方包。它仅作为测试和评估目的而发布。TypeScript-Go 项目仍在积极开发中，被视为实验性项目。

根据[此讨论](https://github.com/microsoft/typescript-go/discussions/466)，官方团队目前没有计划发布 NPM 包，因为该项目仍然非常不完整。

## 为什么存在这个包

这个非官方包允许开发者：

- 无需从源代码构建即可尝试 TypeScript-Go
- 测试与现有工具的集成
- 体验基于 Go 的 TypeScript 实现

## 安装

```bash
npm install @mxyhi/tsgo
```

## 使用方法

本包提供了 `tsgo` 二进制文件，其功能类似于 `tsc`：

```bash
# 检查 TypeScript 文件（类似于 tsc）
npx tsgo tsc path/to/file.ts

# 使用 tsconfig.json 文件
npx tsgo tsc --project path/to/tsconfig.json
```

对于 LSP（语言服务器协议）的使用，请参考[官方仓库](https://github.com/microsoft/typescript-go)获取设置说明。

## 构建计划

该包每 6 小时自动构建并发布一次，在 UTC 时间的 00:00、06:00、12:00 和 18:00。每次构建都包括 TypeScript-Go 仓库的最新更改。

## 当前限制

如官方仓库所述，TypeScript-Go 仍在开发中，许多功能尚未完成。当前限制包括：

- 不支持所有解析模式
- JavaScript 特定的推断和 JSDoc 尚未准备就绪
- JSX 支持尚未准备就绪
- 声明生成尚未准备就绪
- 生成（JS 输出）正在进行中（仅良好支持 `target: esnext`）
- 监视模式仅为原型
- 构建模式/项目引用尚未准备就绪
- 增量构建尚未准备就绪
- 语言服务（LSP）仅为原型，具有最小功能

## 更新

随着 TypeScript-Go 仓库取得重大进展，这个非官方包将定期更新。当官方团队决定发布官方包时，这个非官方包将被弃用，转而支持官方包。

## 贡献

对于与 TypeScript-Go 本身相关的问题，请在[官方仓库](https://github.com/microsoft/typescript-go)中提交。

对于特定于此 NPM 包发行版的问题，请在 <https://github.com/mxyhi/tsgo-npm-release> 中提交。

## 许可证

TypeScript 项目采用 [Apache License 2.0](https://github.com/microsoft/typescript-go/blob/main/LICENSE) 许可。
