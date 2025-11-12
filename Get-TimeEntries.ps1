$CONTENT_FILE = "C:\Users\jlake\OneDrive - Sentinel Technologies\Documents\Time Tracking Excel.xlsx"
$TEMP_FILE = "C:\temp\time_entry.csv"

New-item -type Directory -path (split-path $TEMP_FILE) -Force | out-null



$module = Get-Module -Name ImportExcel -ListAvailable
if ($null -eq $module) {
    Write-Error "You must install the Powershell Module ImportExcel.`nPlease run Install-Module -Name ImportExcel -Scope CurrentUser"
    return
}

if ((test-path $CONTENT_FILE) -eq $false) {
    Write-Error "The content file $CONTENT_FILE does not exist"
}
Import-Excel -Path $CONTENT_FILE  -AsText "Date" | Where-Object { $_.Date } | export-csv -notypeinformation -Path $TEMP_FILE