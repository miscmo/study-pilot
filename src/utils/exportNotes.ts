import type { StudyPlan, DailyTask } from '../types'

// 导出单个计划的所有笔记为 Markdown
export function exportPlanNotes(plan: StudyPlan, dailyTasks: DailyTask[]): string {
  const planTasks = dailyTasks
    .filter(t => t.planId === plan.id)
    .sort((a, b) => a.day - b.day)

  let markdown = `# ${plan.topic}\n\n`
  markdown += `> ${plan.description}\n\n`
  markdown += `---\n\n`

  for (const dayTask of planTasks) {
    const outlineItem = plan.outline.find(o => o.day === dayTask.day)
    markdown += `## Day ${dayTask.day}: ${outlineItem?.title || dayTask.title}\n\n`

    for (const task of dayTask.tasks) {
      if (task.note && task.note.content.trim()) {
        markdown += `### ${task.order}. ${task.title}\n\n`
        markdown += task.note.content
        markdown += `\n\n---\n\n`
      }
    }
  }

  return markdown
}

// 导出为文件
export function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// 统计笔记数量
export function countNotes(dailyTasks: DailyTask[], planId?: string): number {
  const tasks = planId 
    ? dailyTasks.filter(t => t.planId === planId)
    : dailyTasks

  return tasks.reduce((count, dayTask) => {
    return count + dayTask.tasks.filter(t => t.note && t.note.content.trim()).length
  }, 0)
}

// 获取笔记总字数
export function countWords(dailyTasks: DailyTask[], planId?: string): number {
  const tasks = planId 
    ? dailyTasks.filter(t => t.planId === planId)
    : dailyTasks

  return tasks.reduce((count, dayTask) => {
    return count + dayTask.tasks.reduce((taskCount, t) => {
      if (t.note && t.note.content.trim()) {
        // 简单统计中英文字符
        return taskCount + t.note.content.replace(/\s/g, '').length
      }
      return taskCount
    }, 0)
  }, 0)
}
