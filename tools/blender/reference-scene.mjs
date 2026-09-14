import { spawnSync } from 'node:child_process';

// Each builder has its own Blender process and never mutates the original village.
for (const script of ['build_reference_board.py', 'build_board_village.py', 'assemble_reference_board.py']) {
  const result = spawnSync(process.execPath, ['tools/blender/headless.mjs', `tools/blender/${script}`], {
    stdio: 'inherit', windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
