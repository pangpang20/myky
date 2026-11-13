# myky · 我的考研之路

408 考研学习工作区：知识库、错题集与刷题页生成技能。

## 目录

| 目录 | 说明 |
| --- | --- |
| cs408-notes | 408 全科目知识库（数据结构 / 计组 / 操作系统 / 计网），VitePress 站点 |
| 错题集 | 按科目分类的错题集，含交互式刷题页 quiz/index.html 与校验测试 |
| quiz-page-generator | 刷题页生成技能模板，可快速复制生成新的在线练习页 |

## 使用

1. 408 知识库本地预览：进入 cs408-notes 后执行 npm install 与 npm run docs:dev。
2. 错题集测试：进入 错题集 后执行 node tests/quiz.test.mjs 与 node tests/wrong-book.test.mjs。
3. 刷题：启动本地静态服务后访问 http://localhost:4317/。
4. 单选题点击选项即判分，多选题勾选后提交。答错自动记录到 localStorage.ky_wrong_log。

## 错题学习流程

1. 提供错题，按科目收录到 错题集/<科目>/。
2. 分析根因并梳理完整知识点。
3. 出 5 道举一反三 + 3-5 道历年真题风格练习。
4. 通过在线答题页复刷，答错自动记录。