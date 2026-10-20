$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$source = @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;
public static class PortStewardNative {
    [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr OpenProcess(uint rights, bool inherit, int procId);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool GetProcessTimes(IntPtr h, out long created, out long exited, out long kernel, out long user);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool QueryFullProcessImageName(IntPtr h, int flags, StringBuilder text, ref int size);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool TerminateProcess(IntPtr h, uint code);
    [DllImport("kernel32.dll", SetLastError=true)] static extern uint WaitForSingleObject(IntPtr h, uint milliseconds);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
    static string[] Read(IntPtr h) {
        long created, exited, kernel, user;
        if (!GetProcessTimes(h, out created, out exited, out kernel, out user)) throw new Win32Exception();
        int size=32768; var name=new StringBuilder(size);
        if (!QueryFullProcessImageName(h,0,name,ref size)) throw new Win32Exception();
        return new string[] { created.ToString(System.Globalization.CultureInfo.InvariantCulture), name.ToString() };
    }
    public static string[] Identity(int procId) {
        IntPtr h=OpenProcess(0x1000,false,procId);
        if(h==IntPtr.Zero) throw new Win32Exception();
        try { return Read(h); } finally { CloseHandle(h); }
    }
    public static string Stop(int procId,string token,string executable) {
        IntPtr h=OpenProcess(0x1000|0x1|0x100000,false,procId);
        if(h==IntPtr.Zero) throw new Win32Exception();
        try {
            var identity=Read(h);
            if(identity[0]!=token) return "IDENTITY_MISMATCH_PID_REUSED";
            if(String.IsNullOrEmpty(executable) || !String.Equals(identity[1],executable,StringComparison.OrdinalIgnoreCase)) return "EXECUTABLE_MISMATCH";
            if(WaitForSingleObject(h,0)==0) return "PROCESS_ALREADY_EXITED";
            if(!TerminateProcess(h,1)) throw new Win32Exception();
            if(WaitForSingleObject(h,5000)!=0) return "STOP_WAIT_TIMEOUT";
            return "STOPPED_VERIFIED";
        } finally { CloseHandle(h); }
    }
}
'@
try {
    $req = [Console]::In.ReadToEnd() | ConvertFrom-Json
    Add-Type -TypeDefinition $source -Language CSharp
    function Get-Identity([int] $ProcessId, $Detail) {
        try {
            $native = [PortStewardNative]::Identity($ProcessId)
            # CIM command text is advisory. Retain it only when its creation time agrees.
            $command = $null
            if ($Detail -and $Detail.CreationDate) {
                if ([Math]::Abs($Detail.CreationDate.ToFileTimeUtc() - [long]$native[0]) -lt 10) { $command = $Detail.CommandLine }
            }
            return @{pid=$ProcessId;processStartTime=$native[0];executablePath=$native[1];command=$command;workingDirectory=$null;accessDenied=$false}
        } catch {
            return @{pid=$ProcessId;processStartTime=$null;executablePath=$null;command=$null;workingDirectory=$null;accessDenied=$true}
        }
    }
    if ($req.action -eq 'process') {
        $detail=$null
        try { $detail=Get-CimInstance Win32_Process -Filter ("ProcessId=" + [int]$req.pid) -ErrorAction Stop } catch {}
        if ($null -eq (Get-Process -Id ([int]$req.pid) -ErrorAction SilentlyContinue)) { $result=$null } else { $result=Get-Identity ([int]$req.pid) $detail }
    } elseif ($req.action -eq 'stop') {
        if ([int]$req.pid -le 4 -or -not $req.expectedStartTime -or -not $req.expectedExecutablePath) { throw 'Missing or protected process identity.' }
        $code = [PortStewardNative]::Stop([int]$req.pid,[string]$req.expectedStartTime,[string]$req.expectedExecutablePath)
        $result = @{stopped=($code -eq 'STOPPED_VERIFIED');code=$code;pid=[int]$req.pid;stoppedAt=[DateTime]::UtcNow.ToString('o');message=("Stop result for PID " + $req.pid + ": " + $code)}
    } elseif ($req.action -eq 'snapshot') {
        $bindings = @()
        foreach ($line in (& "$env:SystemRoot\System32\netstat.exe" -ano -p tcp)) {
            if ($line -match '^\s*TCP\s+(\S+):(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$') {
                $port = [int]$matches[2]
                if ($req.ports -and $req.ports -notcontains $port) { continue }
                $bindings += @{localAddress=$matches[1];port=$port;pid=[int]$matches[3]}
            }
        }
        if ($LASTEXITCODE -ne 0) { throw 'Windows netstat failed.' }
        $details = @{}
        # Query only listener processes. CIM failures leave identity visible as unavailable.
        foreach ($procId in @($bindings | ForEach-Object {$_.pid} | Sort-Object -Unique)) {
            $detail=$null
            try { $detail=Get-CimInstance Win32_Process -Filter ("ProcessId="+$procId) -ErrorAction Stop } catch {}
            $details[$procId] = Get-Identity $procId $detail
        }
        $result = @($bindings | ForEach-Object {
            $item=@{} + $details[$_.pid]
            $item.port=$_.port; $item.localAddress=$_.localAddress; $item.protocol='TCP'; $item.observedAt=[DateTime]::UtcNow.ToString('o'); $item
        })
    } else { throw 'Unknown local adapter operation.' }
    @{ok=$true;result=$result} | ConvertTo-Json -Depth 8 -Compress
} catch {
    @{ok=$false;error=$_.Exception.Message} | ConvertTo-Json -Depth 4 -Compress
    exit 1
}
