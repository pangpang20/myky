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

for /f "tokens=2 delims=:" %%i in ('powershell -NoProfile -Command "$r=Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Sort-Object RouteMetric | Select-Object -First 1; $a=Get-NetIPAddress -InterfaceIndex $r.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1; if($a){$a.IPAddress}else{(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Sort-Object -Property InterfaceMetric | Select-Object -First 1).IPAddress}"') do set LAN_IP=%%i
if "%LAN_IP%"=="" set LAN_IP=127.0.0.1

echo.
echo ==========================================
echo   启动完成（后台静默运行，无弹窗）
echo ==========================================
echo   本机访问:     http://localhost:4317/  http://localhost:4318/
echo   局域网访问:   http://%LAN_IP%:4317/  http://%LAN_IP%:4318/
echo ==========================================
echo.
echo   日志目录: %ROOT%logs
echo   本机 IP:  %LAN_IP%
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