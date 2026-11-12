-- The tsrs language server for Neovim 0.11+.
--
-- tsrs is the Rust port of the TypeScript 7 compiler. It speaks the same
-- language-server protocol as tsgo, and it is the reason this repository can
-- offer instant type feedback in the editor: a one-file edit rechecks in
-- about 50 ms, against 0.5-20 s for the Go compiler, and it uses 1.5-2.7 GB
-- of memory against 10-15 GB.
--
-- It is wired to the repository's own Bun-native launcher rather than to the
-- `tsrs` npm bin. The npm bin is a Node script (`#!/usr/bin/env node`) that
-- re-execs the native binary; going through scripts/tsrs.ts instead means
-- the editor spawns the Rust binary directly, with no JavaScript runtime in
-- between and no dependency on a package manager being installed.
--
-- Requirements:
--
--   * Neovim 0.11 or newer (the LSP client is built in; no plugin needed).
--   * The repository's dependencies installed, so that
--     node_modules/@tsrs/<platform>/tsrs exists.
--
-- Usage: add this to your init.lua, or source it from your own config:
--
--   local root = vim.fn.expand('~/dev/work/audiobookphile/audiobookphile-web')
--   if vim.fn.filereadable(root .. '/docs/neovim-lsp.lua') == 1 then
--     dofile(root .. '/docs/neovim-lsp.lua')
--   end
--
-- Or, from inside the repository, with the path set for you:
--
--   :lua dofile(vim.fn.getcwd() .. '/docs/neovim-lsp.lua')

local function find_project_root(start)
  -- The lockfile is the marker: it is what makes this a Bun project, and it
  -- only ever exists in the repository root.
  local dir = vim.fs.dirname(start)
  while dir and dir ~= '' do
    if vim.uv.fs_stat(dir .. '/bun.lock') then
      return dir
    end
    local parent = vim.fs.dirname(dir)
    if parent == dir then
      return nil
    end
    dir = parent
  end
  return nil
end

local start_dir = vim.uv.cwd() or vim.fn.getcwd()
local project_root = find_project_root(start_dir)

if not project_root then
  vim.notify('tsrs: no bun.lock found above ' .. start_dir .. ' — the language server was not started.', vim.log.levels.WARN)
  return
end

local launcher = project_root .. '/scripts/tsrs.ts'

if vim.fn.filereadable(launcher) ~= 1 then
  vim.notify('tsrs: ' .. launcher .. ' is missing.', vim.log.levels.ERROR)
  return
end

vim.lsp.config('tsrs', {
  -- `bun run scripts/tsrs.ts --lsp -stdio` resolves the native binary for
  -- this platform and execs it, so the server that answers is the Rust
  -- compiler itself.
  cmd = { 'bun', 'run', launcher, '--lsp', '-stdio' },
  cwd = project_root,
  root_dir = project_root,
  filetypes = { 'typescript', 'typescriptreact', 'javascript', 'javascriptreact' },
  root_markers = { 'tsconfig.json', 'jsconfig.json', 'package.json', '.git' },
})

vim.lsp.enable('tsrs')

-- tsrs and the usual TypeScript servers would otherwise both report the same
-- diagnostics, in two places, for every error. Turning the others off keeps
-- one source of truth.
for _, name in ipairs({ 'ts_ls', 'vtsls', 'tsserver', 'denols' }) do
  pcall(vim.lsp.config, name, { enabled = false })
end

vim.notify('tsrs language server enabled for ' .. project_root, vim.log.levels.INFO)
