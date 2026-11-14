---
name: quiz-page-generator
description: >-
  Generate an interactive local quiz page for wrong-question practice.
  Use when the user sends wrong exam questions or asks for online-style
  quizzes. Creates quiz/index.html + questions.json under 错题集/,
  supports single-choice instant judging and multi-choice submit,
  records wrong answers, and validates structure with a Node test.
---

# Quiz Page Generator

## When to use

- User sends one or more wrong questions (text or screenshot).
- User asks to practice questions interactively, like an online quiz.
- User asks to archive wrong questions into 错题集 by subject.

## Workflow

1. Ensure the target root is `<project>/错题集/`.
   Subject directories: 数据结构 / 计算机组成原理 / 操作系统 / 计算机网络.
2. Create or update:
   - `错题集/quiz/index.html` — interactive quiz page
   - `错题集/quiz/questions.json` — question bank
   - `错题集/tests/quiz.test.mjs` — structure validation
3. For each wrong question, archive a Markdown file under its subject:
   - 题干与选项
   - 我的答案 / 正确答案
   - 根因分析
   - 完整知识点梳理
   - 复刷清单（5 道举一反三 + 3-5 道真题风格）
   - 复习记录
4. Add 5 new practice questions (original + variations) to
   `错题集/quiz/questions.json`. Do not stop at archiving the Markdown:
   the user expects new interactive exercises each time.
5. Register the wrong knowledge point in the Ebbinghaus center:
   - `错题集/ebbinghaus/queue.json` — append an item with
     `id` (`科目-知识点`), `subject`, `file` (subject markdown path),
     `firstLearned`, `reviews: []`, `dueDate` (tomorrow), `nextRound: 1`.
   - `错题集/ebbinghaus/knowledge.json` — add the knowledge summary,
     mnemonic, key points, and per-topic root causes.
   - `错题集/ebbinghaus/questions.json` (or subject-specific file such as
     `ds-questions.json`) — add round-1 questions (about 5) tagged
     `round: 1` and the matching `itemId`.
6. Run tests before finishing:
   - `node tests/quiz.test.mjs`
   - `node tests/wrong-book.test.mjs`
7. Commit as a separate Git commit describing the quiz update.

## Question JSON schema

```json
[
  {
    "id": "subject-sequence",
    "subject": "计算机网络",
    "topic": "网络自治含义",
    "type": "single" | "multi",
    "question": "题干",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "answer": "B" | ["A", "B", "D"],
    "analysis": "解析说明"
  }
]
```

Rules:
- Single choice: clicking an option judges immediately.
- Multi choice: checkboxes + submit button; submit disabled until selection.
- Newly added questions must be placed at the FRONT of the questions
  array (newest first), so the user sees new exercises immediately on
  refresh without replaying older questions.
- Wrong answers append to `localStorage.ky_wrong_log` and show 已记入错题集.
- Final page shows total count and wrong question ids.
- Every question must include analysis for learning.
- Every wrong-question intake must produce: archived markdown + 5 quiz
  questions + Ebbinghaus registration (queue/knowledge/round questions).

## Template

Copy from `assets/quiz-template/`:

```
index.html
questions.json
quiz.test.mjs
```

Then replace the questions array with new content, keep schema valid,
run tests, and commit.

## Serving locally

Use any static server, for example:

```
node -e "require('http').createServer(...).listen(4317)"
```

Or simply open `quiz/index.html` via a static server with JSON fetch support.

## Output style

- Report quiz URL, file paths, test result, and Git commit id.
- If any test fails, fix before declaring completion.
- If environment prevents running tests, state the limitation and remaining risk.
