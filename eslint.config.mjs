// @ts-check
//
// Nuxt + Vue + TypeScript ESLint 配置
// 基于模板：templates/eslint/nuxt-eslint.config.mjs
// 说明：替代 Prettier，用 @stylistic 统一格式化 + 代码质量规则
//
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // 全局忽略
  {
    ignores: [
      'dist/**',
      '.output/**',
    ],
  },

  // 格式化 + 代码质量规则（替代 Prettier）
  {
    rules: {
      // ── 格式化（@stylistic）──
      // 使用单引号
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      // 不使用分号
      '@stylistic/semi': ['error', 'never'],
      // 缩进 2 空格
      '@stylistic/indent': ['error', 2],
      // 尾逗号：多行时加
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      // 箭头函数参数括号：仅在需要时
      '@stylistic/arrow-parens': ['error', 'as-needed'],

      // ── TypeScript ──
      // 关闭 unified-signatures（与 Vue defineEmits 的多事件重载模式冲突）
      '@typescript-eslint/unified-signatures': 'off',
      // 允许 @ts-ignore（带注释说明）
      '@typescript-eslint/ban-ts-comment': 'off',
      // 允许 any（渐进式迁移，以后再收紧）
      '@typescript-eslint/no-explicit-any': 'warn',
      // 未使用变量：警告，但允许以 _ 开头的
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],

      // ── Vue ──
      // 多属性标签换行
      'vue/max-attributes-per-line': ['warn', {
        singleline: { max: 3 },
        multiline: { max: 1 },
      }],
      // 关闭组件名必须多单词（Nuxt 页面经常是单词命名）
      'vue/multi-word-component-names': 'off',
      // HTML 自闭合标签
      'vue/html-self-closing': ['error', {
        html: { void: 'always', normal: 'never', component: 'always' },
        svg: 'always',
        math: 'always',
      }],

      // ── 通用 ──
      // console.log 警告（不阻塞开发，但提醒清理）
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
)
