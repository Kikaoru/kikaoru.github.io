@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo 没有找到 Node.js。请先安装 Node.js，再双击本文件。
  echo https://nodejs.org/
  echo.
  pause
  exit /b 1
)
node build.mjs
if errorlevel 1 (
  echo.
  echo 生成失败，请检查上面的错误信息。
) else (
  echo.
  echo 生成完成。直接双击 index.html 查看。
)
echo.
pause
