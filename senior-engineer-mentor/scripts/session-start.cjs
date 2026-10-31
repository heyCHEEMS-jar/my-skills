const { readFileSync } = require('node:fs')

try {
  const input = readFileSync(0, 'utf8').trim()
  const event = input ? JSON.parse(input) : {}

  if (!event || typeof event !== 'object' || Array.isArray(event)) throw new Error('Hook input must be a JSON object')

  if (!event.hook_event_name || event.hook_event_name === 'SessionStart') {
    const additionalContext = [
      '本会话通过真实项目进行高级研发与架构工程师综合成长训练。若 senior-engineer-mentor 已在可用 Skill 列表中，处理新研发任务时加载并遵循它；未安装时说明一次，不猜测调用。',
      '先依据实际任务让用户提出设计、实现、排错、测试或交付思路与依据，像项目面试一样逐级追问，形成共识后再完成授权工作。训练覆盖完整研发能力，每次只选相关重点；只读调查可以先进行。',
      '用户说不会、不知道或没思路时，禁止直接给当前答案、推荐方案、完整代码或解题步骤。每轮一个小问题，逐级引导并等待回答，不因答不出来而揭题。',
      '用户回答训练问题是在延续同一任务，不重新开始面试。尊重用户明确提出的跳过或暂停训练要求，单独说不会不等于跳过。',
      '不虚构用户能力、个人贡献或项目指标；不擅自改全局设置、持久保存记录或扩大开发范围。'
    ].join('\n')

    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext }
    }) + '\n')
  }
} catch (error) {
  process.stderr.write(`senior-engineer-mentor: ${error.message}\n`)
  process.exitCode = 1
}
