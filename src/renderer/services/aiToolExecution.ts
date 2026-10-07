import { useTabsStore } from '../stores/tabsStore';
import { useFilesStore } from '../stores/filesStore';
import { useTerminalStore } from '../stores/terminalStore';

export interface ParsedToolCall {
  tool: string;
  path?: string;
  content?: string;
  command?: string;
  rawMatched: string;
}

/**
 * Detects if a text string contains JSON tool calls such as:
 * {"tool": "write_file", "path": "main.py", "content": "..."}
 */
export function extractToolCalls(text: string): { toolCalls: ParsedToolCall[]; formattedText: string } {
  if (!text || typeof text !== 'string') {
    return { toolCalls: [], formattedText: text || '' };
  }

  const toolCalls: ParsedToolCall[] = [];
  let formattedText = text;

  // 1. Check if the entire text (or a fenced code block) is a single JSON tool call
  const trimmed = text.trim();
  const codeBlockMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidateJson = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed;

  if (candidateJson.startsWith('{') && candidateJson.endsWith('}')) {
    try {
      const parsed = JSON.parse(candidateJson);
      const tool = parsed.tool || parsed.action || parsed.name || parsed.function;
      if (tool) {
        const path = parsed.path || parsed.file || parsed.filepath || parsed.filename;
        const content = parsed.content ?? parsed.code ?? parsed.text;
        const command = parsed.command || parsed.cmd;
        toolCalls.push({
          tool: String(tool),
          path: path ? String(path) : undefined,
          content: content !== undefined ? String(content) : undefined,
          command: command ? String(command) : undefined,
          rawMatched: trimmed,
        });
      }
    } catch {
      // Not a single valid JSON string, continue to embedded detection
    }
  }

  // 2. If no full-string tool call was found, find embedded JSON blocks
  if (toolCalls.length === 0) {
    const jsonBlockRegex = /\{[\s\S]*?"(?:tool|action|name|function)"\s*:\s*"([^"]+)"[\s\S]*?\}/g;
    let match: RegExpExecArray | null;

    while ((match = jsonBlockRegex.exec(text)) !== null) {
      try {
        const parsed = JSON.parse(match[0]);
        const tool = parsed.tool || parsed.action || parsed.name || parsed.function;
        if (tool) {
          const path = parsed.path || parsed.file || parsed.filepath || parsed.filename;
          const content = parsed.content ?? parsed.code ?? parsed.text;
          const command = parsed.command || parsed.cmd;
          toolCalls.push({
            tool: String(tool),
            path: path ? String(path) : undefined,
            content: content !== undefined ? String(content) : undefined,
            command: command ? String(command) : undefined,
            rawMatched: match[0],
          });
        }
      } catch {
        // Ignore partial regex matches that are not valid JSON
      }
    }
  }

  // 3. Format tool calls into clean Markdown presentation
  for (const tc of toolCalls) {
    const toolLower = tc.tool.toLowerCase();
    if (toolLower.includes('write') || toolLower.includes('create') || toolLower.includes('file')) {
      const fileName = tc.path ? tc.path.split('/').pop() || tc.path : 'file';
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      const lang = ext === 'py' ? 'python' : ext === 'js' ? 'javascript' : ext === 'ts' ? 'typescript' : ext;

      const codeSection = tc.content !== undefined
        ? `\n\n\`\`\`${lang}\n${tc.content.trimEnd()}\n\`\`\``
        : '';

      const replacement = `I've created **\`${fileName}\`**:${codeSection}`;

      if (formattedText.trim() === tc.rawMatched) {
        formattedText = replacement;
      } else {
        formattedText = formattedText.replace(tc.rawMatched, replacement);
      }
    }
  }

  return { toolCalls, formattedText };
}

/**
 * Executes detected tool calls such as writing files to the workspace and opening them in tabs.
 */
export async function executeToolCalls(toolCalls: ParsedToolCall[], rootPath: string | null): Promise<void> {
  if (!rootPath || toolCalls.length === 0) return;

  for (const tc of toolCalls) {
    const toolLower = tc.tool.toLowerCase();
    if (toolLower.includes('write') || toolLower.includes('create') || toolLower.includes('file')) {
      if (tc.path && typeof tc.content === 'string') {
        const cleanPath = tc.path.replace(/^\/+/, '').trim();
        // Prevent random sentences without extensions from being created as files
        const hasValidExtension = /\.[a-zA-Z0-9_-]+$/.test(cleanPath);
        if (!hasValidExtension) {
          continue;
        }

        const fullPath = tc.path.startsWith('/') ? tc.path : `${rootPath}/${cleanPath}`;
        const fileName = cleanPath.split('/').pop() || cleanPath;

        try {
          // 1. Write file to disk
          if (window.coreMindAPI?.writeFile) {
            await window.coreMindAPI.writeFile(fullPath, tc.content, rootPath);
          }

          // 2. Refresh file explorer tree
          await useFilesStore.getState().loadWorkspaceTree(rootPath);

          // 3. Open file in Monaco editor and update content
          const tabsState = useTabsStore.getState();
          await tabsState.openFile(fullPath, fileName, rootPath);
          tabsState.updateTabContent(fullPath, tc.content);

          // 4. Mark tab as saved
          useTabsStore.setState((state) => ({
            tabs: state.tabs.map((t) =>
              t.id === fullPath
                ? { ...t, content: tc.content!, savedContent: tc.content!, isDirty: false }
                : t
            ),
          }));
        } catch (err) {
          console.error('[AI Tool Execution] Failed to write/open file:', err);
        }
      }
    } else if (
      tc.command ||
      toolLower.includes('terminal') ||
      toolLower.includes('command') ||
      toolLower.includes('bash') ||
      toolLower.includes('exec') ||
      toolLower.includes('run')
    ) {
      const cmdToRun = tc.command || tc.content;
      if (cmdToRun && typeof cmdToRun === 'string') {
        try {
          await useTerminalStore.getState().runCommand(cmdToRun);
        } catch (err) {
          console.error('[AI Tool Execution] Failed to run command in terminal:', err);
        }
      }
    }
  }
}
