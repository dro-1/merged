/** Languages offered as filters. `name` is the GitHub (Linguist) language name. */
export const LANGUAGES = [
  { id: 'typescript', name: 'TypeScript' },
  { id: 'javascript', name: 'JavaScript' },
  { id: 'python', name: 'Python' },
  { id: 'go', name: 'Go' },
  { id: 'rust', name: 'Rust' },
  { id: 'java', name: 'Java' },
  { id: 'kotlin', name: 'Kotlin' },
  { id: 'csharp', name: 'C#' },
  { id: 'cpp', name: 'C++' },
  { id: 'c', name: 'C' },
  { id: 'ruby', name: 'Ruby' },
  { id: 'php', name: 'PHP' },
  { id: 'swift', name: 'Swift' },
  { id: 'dart', name: 'Dart' },
  { id: 'elixir', name: 'Elixir' },
] as const

export type LanguageId = (typeof LANGUAGES)[number]['id']

/** Frameworks offered as filters, each identified by the GitHub topic it maps to. */
export const FRAMEWORKS = [
  { topic: 'react', label: 'React' },
  { topic: 'vue', label: 'Vue' },
  { topic: 'angular', label: 'Angular' },
  { topic: 'svelte', label: 'Svelte' },
  { topic: 'nextjs', label: 'Next.js' },
  { topic: 'react-native', label: 'React Native' },
  { topic: 'express', label: 'Express' },
  { topic: 'nestjs', label: 'NestJS' },
  { topic: 'django', label: 'Django' },
  { topic: 'flask', label: 'Flask' },
  { topic: 'fastapi', label: 'FastAPI' },
  { topic: 'rails', label: 'Ruby on Rails' },
  { topic: 'laravel', label: 'Laravel' },
  { topic: 'spring-boot', label: 'Spring Boot' },
  { topic: 'flutter', label: 'Flutter' },
] as const

export type FrameworkTopic = (typeof FRAMEWORKS)[number]['topic']

export const PUSHED_WITHIN_DAYS = [7, 30, 90, 365] as const

export type PushedWithinDays = (typeof PUSHED_WITHIN_DAYS)[number]

export const MIN_STARS_OPTIONS = [
  { value: 0, label: 'Any' },
  { value: 10, label: '10' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
  { value: 500, label: '500' },
  { value: 1000, label: '1k' },
  { value: 5000, label: '5k' },
] as const

export type MinStars = (typeof MIN_STARS_OPTIONS)[number]['value']

/** Minimum-count presets shared by the good-first-issue and help-wanted filters. */
export const MIN_ISSUES_OPTIONS = [
  { value: 0, label: 'Any' },
  { value: 1, label: '1+' },
  { value: 3, label: '3+' },
  { value: 5, label: '5+' },
  { value: 10, label: '10+' },
] as const

export type MinIssues = (typeof MIN_ISSUES_OPTIONS)[number]['value']
