@echo off
chcp 65001 >nul
title 计算机考研刷题系统

echo ==========================================
echo   计算机考研刷题系统 - 启动
echo ==========================================
echo.

REM 检查端口占用
netstat -ano | findstr :4317 | findstr LISTENING >nul
if %errorlevel%==0 (
    echo [4317] 已在运行，跳过
) else (
    echo [4317] 启动新错题练习服务...
    start "quiz-4317" /min node "%~dp0quiz\server.js"
)

netstat -ano | findstr :4318 | findstr LISTENING >nul
if %errorlevel%==0 (
    echo [4318] 已在运行，跳过
) else (
    echo [4318] 启动艾宾浩斯复习服务...
    start "ebbinghaus-4318" /min node "%~dp0ebbinghaus\server.js"
)

timeout /t 2 /nobreak >nul

echo.
echo ==========================================
echo   启动完成
echo ==========================================
echo   新错题练习:   http://localhost:4317/
echo   艾宾浩斯复习: http://localhost:4318/
echo ==========================================
echo.

choice /c OS /m "按 O 打开浏览器, 按 S 退出脚本"
if errorlevel 2 goto :end
start http://localhost:4317/
start http://localhost:4318/

:end