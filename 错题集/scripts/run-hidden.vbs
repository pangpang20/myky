' 静默启动 node 服务，不显示控制台窗口
' 用法: wscript run-hidden.vbs "<js文件路径>" "<日志文件路径>"
Option Explicit
Dim sh, jsPath, logPath, cmd
Set sh = CreateObject("WScript.Shell")
If WScript.Arguments.Count = 0 Then WScript.Quit 1
jsPath = WScript.Arguments(0)
If WScript.Arguments.Count >= 2 Then
  logPath = WScript.Arguments(1)
Else
  logPath = ""
End If
If logPath = "" Then
  cmd = "node """ & jsPath & """"
Else
  cmd = "cmd /c node """ & jsPath & """ >> """ & logPath & """ 2>&1"
End If
sh.Run cmd, 0, False