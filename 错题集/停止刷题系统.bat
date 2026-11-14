@echo off
chcp 65001 >nul
title 计算机考研刷题系统 - 停止

echo ==========================================
echo   计算机考研刷题系统 - 停止
echo ==========================================
echo.

echo 正在停止 4317 新错题练习...
set "FOUND4317=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4317 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
    echo   已终止 PID %%a
    set "FOUND4317=1"
)
if "%FOUND4317%"=="0" echo   未在运行

echo 正在停止 4318 艾宾浩斯复习...
set "FOUND4318=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4318 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
    echo   已终止 PID %%a
    set "FOUND4318=1"
)
if "%FOUND4318%"=="0" echo   未在运行

echo.
echo 全部停止完成。
echo.
pause