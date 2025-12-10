import type { StudyPlan, StudyOutlineItem, DailyTask, TaskItem, TaskReview, Resource, Deliverable } from '../types'

interface AIServiceConfig {
  apiKey: string
  apiEndpoint: string
  model: string
}

class AIService {
  private config: AIServiceConfig = {
    apiKey: '',
    apiEndpoint: 'https://api.openai.com/v1',
    model: 'gpt-4'
  }

  setConfig(config: Partial<AIServiceConfig>) {
    this.config = { ...this.config, ...config }
  }

  // 解析 JSON 响应，处理各种格式
  private parseJSONResponse(response: string): unknown {
    // 移除可能的 markdown 代码块标记
    let cleaned = response.trim()
    
    // 处理 ```json ... ``` 格式
    const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonBlockMatch) {
      cleaned = jsonBlockMatch[1].trim()
    }
    
    // 尝试直接解析
    try {
      return JSON.parse(cleaned)
    } catch {
      // 尝试提取 JSON 对象
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0])
        } catch {
          // 尝试修复常见问题
          let fixedJson = jsonMatch[0]
          // 移除尾部多余的逗号
          fixedJson = fixedJson.replace(/,(\s*[}\]])/g, '$1')
          // 尝试解析修复后的 JSON
          return JSON.parse(fixedJson)
        }
      }
      throw new Error('无法从响应中提取有效的 JSON')
    }
  }

  private async callAPI(messages: { role: string; content: string }[]): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('请先在设置中配置 API Key')
    }

    const response = await fetch(`${this.config.apiEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: 0.7,
        max_tokens: 4000
      })
    })

    if (!response.ok) {
      let errorMessage = '调用 AI 服务失败'
      try {
        const error = await response.json()
        errorMessage = error.error?.message || error.message || errorMessage
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`
      }
      throw new Error(errorMessage)
    }

    const data = await response.json()
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('AI 返回了空响应，请重试')
    }
    
    return data.choices[0].message.content
  }

  // 生成学习计划大纲
  async generateStudyOutline(
    topic: string,
    dailyMinutes: number,
    totalDays: number,
    learningGoals?: string,
    autoCalculateDays?: boolean
  ): Promise<{ description: string; outline: StudyOutlineItem[] }> {
    const goalsSection = learningGoals?.trim() 
      ? `\n用户的学习目标和期望:\n${learningGoals}\n\n请特别注意根据用户描述的学习目标来定制学习内容，确保计划能够帮助用户达成他们的具体目标。`
      : ''

    const daysInstruction = autoCalculateDays
      ? `请根据学习主题的完整性和深度，自动规划需要多少天才能完整学会这个主题。不要因为时间限制而省略重要内容，要确保学全学精。你可以根据内容复杂度自由决定天数（可以是几天、几十天甚至上百天）。`
      : `总学习天数: ${totalDays} 天\n- outline 数组应该有 ${totalDays} 个元素`

    const prompt = `你是一位专业的学习规划师。请为以下学习主题生成一个详细的学习计划大纲。

学习主题: ${topic}
每日学习时间: ${dailyMinutes} 分钟
${autoCalculateDays ? '' : `总学习天数: ${totalDays} 天`}
${goalsSection}

${autoCalculateDays ? daysInstruction : ''}

请生成一个结构化的学习计划，包含:
1. 学习主题的简要描述（2-3句话，需要体现用户的学习目标）
2. 每天的学习安排

请以 JSON 格式返回，格式如下:
{
  "description": "学习主题描述",
  "outline": [
    {
      "day": 1,
      "title": "第一天学习标题",
      "description": "当天学习内容概述",
      "objectives": ["目标1", "目标2", "目标3"],
      "estimatedMinutes": ${dailyMinutes}
    }
  ]
}

注意:
${autoCalculateDays ? '- outline 数组的元素数量由你根据内容完整性决定，确保能完整覆盖所有必要知识点' : `- outline 数组应该有 ${totalDays} 个元素`}
- 学习内容应该循序渐进，由浅入深
- 每天的学习目标应该具体可衡量
- 如果用户提供了学习目标，请确保学习计划紧密围绕这些目标展开
- 内容要完整系统，不要因为天数限制而省略重要知识点
- 只返回 JSON，不要有其他内容`

    const response = await this.callAPI([
      { role: 'system', content: '你是一位专业的学习规划师，擅长制定系统化的学习计划。请严格按照要求的 JSON 格式返回，不要添加任何额外的文字说明。' },
      { role: 'user', content: prompt }
    ])

    try {
      const parsed = this.parseJSONResponse(response) as {
        description: string
        outline: Omit<StudyOutlineItem, 'id'>[]
      }
      
      if (!parsed.description || !Array.isArray(parsed.outline)) {
        throw new Error('返回的数据结构不正确')
      }
      
      // 为每个大纲项添加 ID
      const outline: StudyOutlineItem[] = parsed.outline.map((item, index: number) => ({
        ...item,
        id: `outline-${index + 1}`,
        day: item.day || index + 1,
        title: item.title || `第 ${index + 1} 天`,
        description: item.description || '',
        objectives: item.objectives || [],
        estimatedMinutes: item.estimatedMinutes || dailyMinutes
      }))

      return {
        description: parsed.description,
        outline
      }
    } catch (err) {
      console.error('解析学习计划失败:', err, '\n原始响应:', response)
      throw new Error(`解析学习计划失败: ${err instanceof Error ? err.message : '请重试'}`)
    }
  }

  // 生成每日具体任务
  async generateDailyTask(
    plan: StudyPlan,
    day: number,
    previousDayReview?: TaskReview,
    regenerateNote?: string
  ): Promise<Omit<DailyTask, 'id' | 'planId' | 'date' | 'status'>> {
    const outlineItem = plan.outline.find(o => o.day === day)
    if (!outlineItem) {
      throw new Error('找不到对应的学习大纲')
    }

    let contextInfo = ''
    if (previousDayReview) {
      contextInfo = `
昨日学习情况:
- 得分: ${previousDayReview.score}/100
- 反馈: ${previousDayReview.feedback}
- 优点: ${previousDayReview.strengths.join(', ')}
- 待改进: ${previousDayReview.improvements.join(', ')}

请根据昨日的学习情况，适当调整今日的学习内容和难度。`
    }

    let regenerateInfo = ''
    if (regenerateNote) {
      regenerateInfo = `
用户对之前生成的内容不满意，要求重新生成。
用户的备注/要求: ${regenerateNote}

请特别注意用户的备注，根据用户的要求调整生成的内容。`
    }

    const prompt = `你是一位专业的学习导师。请为学生生成今天的具体学习任务。

学习主题: ${plan.topic}
今天是第 ${day} 天 / 共 ${plan.totalDays} 天
今日学习时间: ${plan.dailyStudyMinutes} 分钟
今日学习主题: ${outlineItem.title}
今日学习描述: ${outlineItem.description}
今日学习目标: ${outlineItem.objectives.join(', ')}
${contextInfo}
${regenerateInfo}

【重要】任务设计原则:
1. 任务必须按照学习顺序排列，从简单到进阶，从基础到深入
2. 每个任务都是前一个任务的延续和深化，形成逻辑递进关系
3. 每个任务都有自己对应的参考资料和验收成果
4. 第一个任务应该是最基础的入门内容，最后一个任务应该是当天最有挑战性的内容

请生成详细的学习任务，以 JSON 格式返回:
{
  "title": "今日学习标题",
  "tasks": [
    {
      "order": 1,
      "title": "任务标题（体现这是第几步/什么阶段）",
      "description": "详细描述该任务的内容和要求，说明为什么这个任务要在这个顺序",
      "difficulty": "basic|intermediate|advanced",
      "estimatedMinutes": 20,
      "resources": [
        {
          "title": "资源标题",
          "type": "article|video|book|documentation|practice",
          "url": "资源链接（仅当100%确定有效时才填写）",
          "description": "资源描述",
          "author": "作者/出处"
        }
      ],
      "deliverable": {
        "title": "成果标题",
        "description": "需要提交的具体内容描述",
        "type": "note|code|project|quiz|summary"
      }
    }
  ]
}

【任务顺序示例】:
- 任务1 (basic): 了解概念、阅读文档 → 验收：概念笔记
- 任务2 (basic/intermediate): 跟着教程实践 → 验收：练习代码
- 任务3 (intermediate): 独立完成小练习 → 验收：独立作品
- 任务4 (advanced): 综合应用或扩展挑战 → 验收：项目或总结

【关于参考资料的要求】:
1. 每个任务的资源要与该任务内容直接相关
2. 只推荐确定存在且广受认可的经典资源
3. URL 只有100%确定有效才填写，否则不填
4. 书籍类型不需要链接，只需书名和作者
5. 如果没有确定的资源，resources 可以为空数组

【其他注意事项】:
- tasks 应该有 3-5 个任务，按 order 从 1 开始递增
- 每个任务都必须有一个对应的 deliverable
- 所有任务时间加起来应该约等于 ${plan.dailyStudyMinutes} 分钟
- difficulty 分布建议：1-2个 basic，1-2个 intermediate，0-1个 advanced
- 只返回 JSON，不要有其他内容`

    const response = await this.callAPI([
      { role: 'system', content: '你是一位专业的学习导师，擅长设计循序渐进、逻辑清晰的学习任务。每个任务都要有明确的学习目标和验收标准。请严格按照要求的 JSON 格式返回。' },
      { role: 'user', content: prompt }
    ])

    try {
      const parsed = this.parseJSONResponse(response) as {
        title: string
        tasks: {
          order: number
          title: string
          description: string
          difficulty: string
          estimatedMinutes: number
          resources: { title: string; type: string; url?: string; description: string; author?: string }[]
          deliverable: { title: string; description: string; type: string }
        }[]
      }
      
      // 按 order 排序任务
      const sortedTasks = (parsed.tasks || []).sort((a, b) => (a.order || 0) - (b.order || 0))
      
      return {
        day,
        title: parsed.title || `第 ${day} 天学习`,
        tasks: sortedTasks.map((t, i: number) => ({
          id: `task-${day}-${i + 1}`,
          order: t.order || i + 1,
          title: t.title,
          description: t.description,
          difficulty: (['basic', 'intermediate', 'advanced'].includes(t.difficulty) 
            ? t.difficulty 
            : 'basic') as 'basic' | 'intermediate' | 'advanced',
          completed: false,
          estimatedMinutes: t.estimatedMinutes || 20,
          resources: (t.resources || []).map((r, ri: number): Resource => ({
            id: `resource-${day}-${i + 1}-${ri + 1}`,
            title: r.title,
            type: (['article', 'video', 'book', 'documentation', 'practice'].includes(r.type) 
              ? r.type 
              : 'article') as Resource['type'],
            url: r.url || undefined,
            description: r.description,
            author: r.author
          })),
          deliverable: {
            id: `deliverable-${day}-${i + 1}`,
            title: t.deliverable?.title || '完成任务',
            description: t.deliverable?.description || '完成上述任务要求',
            type: (['note', 'code', 'project', 'quiz', 'summary'].includes(t.deliverable?.type)
              ? t.deliverable.type
              : 'note') as Deliverable['type'],
            completed: false
          }
        }))
      }
    } catch (err) {
      console.error('解析每日任务失败:', err, '\n原始响应:', response)
      throw new Error(`解析每日任务失败: ${err instanceof Error ? err.message : '请重试'}`)
    }
  }

  // 重新生成单个任务
  async regenerateSingleTask(
    plan: StudyPlan,
    day: number,
    taskOrder: number,
    note?: string
  ): Promise<TaskItem> {
    const outlineItem = plan.outline.find(o => o.day === day)
    if (!outlineItem) {
      throw new Error('找不到对应的学习大纲')
    }

    const prompt = `你是一位专业的学习导师。请重新生成一个学习任务。

学习主题: ${plan.topic}
今天是第 ${day} 天
今日学习主题: ${outlineItem.title}
任务顺序: 第 ${taskOrder} 个任务（共约 3-5 个任务）
${note ? `用户备注: ${note}` : ''}

请生成一个学习任务，以 JSON 格式返回:
{
  "title": "任务标题",
  "description": "详细描述",
  "difficulty": "basic|intermediate|advanced",
  "estimatedMinutes": 20,
  "resources": [
    {
      "title": "资源标题",
      "type": "article|video|book|documentation|practice",
      "url": "资源链接（可选）",
      "description": "资源描述",
      "author": "作者"
    }
  ],
  "deliverable": {
    "title": "成果标题",
    "description": "验收内容描述",
    "type": "note|code|project|quiz|summary"
  }
}

注意：
- 根据任务顺序调整难度（前面的任务更基础，后面的更进阶）
- 只返回 JSON`

    const response = await this.callAPI([
      { role: 'system', content: '你是一位专业的学习导师。请严格按照 JSON 格式返回。' },
      { role: 'user', content: prompt }
    ])

    const parsed = this.parseJSONResponse(response) as {
      title: string
      description: string
      difficulty: string
      estimatedMinutes: number
      resources: { title: string; type: string; url?: string; description: string; author?: string }[]
      deliverable: { title: string; description: string; type: string }
    }

    return {
      id: `task-${day}-${taskOrder}-${Date.now()}`,
      order: taskOrder,
      title: parsed.title,
      description: parsed.description,
      difficulty: (['basic', 'intermediate', 'advanced'].includes(parsed.difficulty) 
        ? parsed.difficulty 
        : 'basic') as 'basic' | 'intermediate' | 'advanced',
      completed: false,
      estimatedMinutes: parsed.estimatedMinutes || 20,
      resources: (parsed.resources || []).map((r, i: number): Resource => ({
        id: `resource-${day}-${taskOrder}-${i + 1}`,
        title: r.title,
        type: (['article', 'video', 'book', 'documentation', 'practice'].includes(r.type) 
          ? r.type 
          : 'article') as Resource['type'],
        url: r.url || undefined,
        description: r.description,
        author: r.author
      })),
      deliverable: {
        id: `deliverable-${day}-${taskOrder}`,
        title: parsed.deliverable?.title || '完成任务',
        description: parsed.deliverable?.description || '完成上述任务要求',
        type: (['note', 'code', 'project', 'quiz', 'summary'].includes(parsed.deliverable?.type)
          ? parsed.deliverable.type
          : 'note') as Deliverable['type'],
        completed: false
      }
    }
  }

  // AI 评审任务提交
  async reviewSubmission(
    plan: StudyPlan,
    dailyTask: DailyTask,
    submissionContent: string
  ): Promise<TaskReview> {
    // 构建任务和验收成果列表
    const tasksInfo = dailyTask.tasks.map(t => 
      `- 任务${t.order}: ${t.title}\n  描述: ${t.description}\n  验收成果: ${t.deliverable.title} - ${t.deliverable.description}`
    ).join('\n')

    const prompt = `你是一位严格但公正的学习评审员。请评审学生提交的学习成果。

学习主题: ${plan.topic}
今日学习标题: ${dailyTask.title}

今日学习任务及验收要求:
${tasksInfo}

学生提交的内容:
${submissionContent}

请评审学生的提交，以 JSON 格式返回:
{
  "score": 85,
  "feedback": "总体评价（2-3句话）",
  "strengths": ["优点1", "优点2"],
  "improvements": ["待改进1", "待改进2"]
}

评分标准:
- 90-100: 优秀，超出预期
- 80-89: 良好，达到要求
- 70-79: 合格，基本完成
- 60-69: 及格，有明显不足
- 60以下: 不及格，需要重新学习

注意:
- 评分要客观公正
- feedback 要具体有建设性
- strengths 和 improvements 各 2-3 条
- 只返回 JSON，不要有其他内容`

    const response = await this.callAPI([
      { role: 'system', content: '你是一位严格但公正的学习评审员，擅长给出建设性的反馈。请严格按照要求的 JSON 格式返回，不要添加任何额外的文字说明。' },
      { role: 'user', content: prompt }
    ])

    try {
      const parsed = this.parseJSONResponse(response) as {
        score: number
        feedback: string
        strengths: string[]
        improvements: string[]
      }
      
      return {
        score: parsed.score || 70,
        feedback: parsed.feedback || '完成了学习任务',
        strengths: parsed.strengths || ['按时完成'],
        improvements: parsed.improvements || ['继续保持'],
        reviewedAt: new Date().toISOString()
      }
    } catch (err) {
      console.error('解析评审结果失败:', err, '\n原始响应:', response)
      throw new Error(`解析评审结果失败: ${err instanceof Error ? err.message : '请重试'}`)
    }
  }

  // 根据任务目标生成智能笔记模板
  async generateNoteTemplate(
    taskTitle: string,
    taskDescription: string,
    deliverableTitle: string,
    deliverableDescription: string,
    deliverableType: string
  ): Promise<string> {
    const prompt = `你是一位专业的学习导师。请根据以下学习任务信息，生成一个 Markdown 笔记模板。

任务标题: ${taskTitle}
任务描述: ${taskDescription}
验收成果: ${deliverableTitle}
验收要求: ${deliverableDescription}
成果类型: ${deliverableType}

【重要要求】:
1. 模板必须紧密围绕任务目标和验收要求设计
2. 用户按照模板填写完成后，应该能够直接满足验收要求
3. 模板应包含具体的填写引导，而不是空泛的标题
4. 根据成果类型调整模板结构：
   - note: 侧重知识点记录和理解
   - code: 侧重代码实现和解释
   - project: 侧重项目设计和实现步骤
   - quiz: 侧重问题回答和知识检验
   - summary: 侧重总结归纳和反思

请直接返回 Markdown 格式的模板内容，不要用代码块包裹，不要有其他说明。

模板设计原则:
- 第一级标题使用任务标题
- 包含 2-4 个主要部分，每个部分有明确的填写指引
- 使用 > 引用块给出填写提示
- 使用 - [ ] 待办项列出需要完成的具体事项
- 如果是代码类任务，预留代码块位置
- 最后包含"验收自检"部分，列出验收要点供用户自查`

    const response = await this.callAPI([
      { role: 'system', content: '你是一位专业的学习导师，擅长设计结构化的学习笔记模板。请直接返回 Markdown 内容，不要有任何额外说明。' },
      { role: 'user', content: prompt }
    ])

    return response.trim()
  }

  // 生成明日计划预览
  async generateNextDayPreview(
    plan: StudyPlan,
    currentDay: number,
    currentReview: TaskReview
  ): Promise<string> {
    const nextOutlineItem = plan.outline.find(o => o.day === currentDay + 1)
    if (!nextOutlineItem) {
      return '恭喜你完成了所有学习计划！'
    }

    const prompt = `根据今日的学习评审结果，生成明天学习计划的简要预览。

今日评审:
- 得分: ${currentReview.score}/100
- 反馈: ${currentReview.feedback}
- 待改进: ${currentReview.improvements.join(', ')}

明日学习大纲:
- 标题: ${nextOutlineItem.title}
- 描述: ${nextOutlineItem.description}
- 目标: ${nextOutlineItem.objectives.join(', ')}

请用 2-3 段话描述明天的学习重点和建议，不要使用 JSON 格式，直接返回文本内容。
如果今天有需要改进的地方，说明明天会如何针对性加强。`

    const response = await this.callAPI([
      { role: 'system', content: '你是一位贴心的学习助手，擅长鼓励学生并给出明确的学习方向。' },
      { role: 'user', content: prompt }
    ])

    return response
  }
}

export const aiService = new AIService()
