# Working rules on this Mac

- Stay inside the current project folder. Use relative paths, and quote every path in a shell command: `cd "src/app"`.
- Before `npm run build` or `npm run dev`, run `npm install` if `node_modules` is missing.
- Do one change at a time, then check it: run the build or the type check and read the errors.
- To fix an error, open the line the error points to and change only what is broken. Do not rewrite the whole file.
- If an edit fails because the old text does not match, read the file again and copy the exact text before you retry.
- When the task is done, stop and list what you changed in a few lines.
