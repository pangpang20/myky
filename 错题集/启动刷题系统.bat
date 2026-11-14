@echo off
chcp 65001 >nul
title 计算机考研刷题系统

echo ==========================================
echo   计算机考研刷题系统 - 启动
echo ==========================================
echo.

set "ROOT=%~dp0"
if not exist "%ROOT%logs" mkdir "%ROOT%logs"

netstat -ano | findstr :4317 | findstr LISTENING >nul
if %errorlevel%==0 (
    echo [4317] 已在运行，跳过
) else (
    echo [4317] 启动新错题练习服务...
    wscript "%ROOT%scripts\run-hidden.vbs" "%ROOT%quiz\server.js" "%ROOT%logs\quiz.log"
)

netstat -ano | findstr :4318 | findstr LISTENING >nul
if %errorlevel%==0 (
    echo [4318] 已在运行，跳过
) else (
    echo [4318] 启动艾宾浩斯复习服务...
    wscript "%ROOT%scripts\run-hidden.vbs" "%ROOT%ebbinghaus\server.js" "%ROOT%logs\ebbinghaus.log"
)

timeout /t 2 /nobreak >nul

echo.
echo ==========================================
echo   启动完成（后台静默运行，无弹窗）
echo ==========================================
echo   新错题练习:   http://localhost:4317/
echo   艾宾浩斯复习: http://localhost:4318/
echo ==========================================
echo.
echo   日志目录: %ROOT%logs
echo.

choice /c OSQ /m "按 O 打开浏览器, 按 S 直接退出, 按 Q 停止服务"
if errorlevel 3 goto :stop
if errorlevel 2 goto :end
start http://localhost:4317/
start http://localhost:4318/
goto :end

:stop
call "%ROOT%停止刷题系统.bat"

:end