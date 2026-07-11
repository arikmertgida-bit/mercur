import { LoaderOptions, IMedusaInternalService } from "@medusajs/framework/types"
import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { FilterRule } from "../models/filter-rule"
import { CompiledRuleset, FilterRuleDTO } from "../types/common"

let compiledRuleset: CompiledRuleset = {
  exactWords: new Set<string>(),
  exactRules: new Map<string, string>(),
  containsPatterns: [],
  regexPatterns: [],
}

export function getCompiledRuleset(): CompiledRuleset {
  return compiledRuleset
}

export function isRulesetEmpty(): boolean {
  return (
    compiledRuleset.exactWords.size === 0 &&
    compiledRuleset.containsPatterns.length === 0 &&
    compiledRuleset.regexPatterns.length === 0
  )
}

export function invalidateRuleset(): void {
  compiledRuleset = {
    exactWords: new Set<string>(),
    exactRules: new Map<string, string>(),
    containsPatterns: [],
    regexPatterns: [],
  }
}

type MessagingFiltersModuleService = {
  listFilterRules: (
    filters: { is_enabled?: boolean },
    config: { take: number }
  ) => Promise<FilterRuleDTO[]>
}

async function compileFilters(container: MedusaContainer): Promise<void> {
  let rules: FilterRuleDTO[]
  try {
    const service = container.resolve("filterRuleService") as IMedusaInternalService<typeof FilterRule>
    const [results] = await service.listAndCount({ is_enabled: true }, { take: 1000 })
    rules = results as FilterRuleDTO[]
  } catch {
    try {
      const service = container.resolve<MessagingFiltersModuleService>("messagingFilters")
      rules = await service.listFilterRules({ is_enabled: true }, { take: 1000 })
    } catch {
      return
    }
  }

  const newRuleset: CompiledRuleset = {
    exactWords: new Set<string>(),
    exactRules: new Map<string, string>(),
    containsPatterns: [],
    regexPatterns: [],
  }

  for (const rule of rules) {
    switch (rule.match_type) {
      case "exact": {
        const lowered = rule.pattern.toLowerCase()
        newRuleset.exactWords.add(lowered)
        newRuleset.exactRules.set(lowered, rule.id)
        break
      }
      case "contains": {
        newRuleset.containsPatterns.push({
          id: rule.id,
          pattern: rule.pattern.toLowerCase(),
        })
        break
      }
      case "regex": {
        try {
          const regex = new RegExp(rule.pattern, "i")
          const probeStart = Date.now()
          regex.test("a".repeat(50))
          if (Date.now() - probeStart > 10) {
            try {
              const logger = container.resolve?.(ContainerRegistrationKeys.LOGGER)
              logger?.warn(`[messaging] Skipping ReDoS-prone regex rule ${rule.id}: ${rule.pattern}`)
            } catch { /* no logger available */ }
            break
          }
          newRuleset.regexPatterns.push({
            id: rule.id,
            regex,
          })
        } catch {
          // Skip invalid regex patterns
        }
        break
      }
    }
  }

  compiledRuleset = newRuleset
}

export async function recompileFilters(container: MedusaContainer): Promise<void> {
  await compileFilters(container)
}

export default async function compileFiltersLoader({
  container,
}: LoaderOptions): Promise<void> {
  try {
    await compileFilters(container)
  } catch {
    // Will be compiled lazily on first message
  }
}
