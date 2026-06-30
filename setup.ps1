$scriptDirectory = "$env:OneDrive\Documents\Time Tracking"
$excelFileSrc = "Example - Time Tracking Excel.xlsx"
$excelFileDest = "Time Tracking Excel.xlsx"
$scriptFileSrc = "Get-TimeEntries.ps1"
$scriptFileDest = "Get-TimeEntries.ps1"



$newScriptDirectory = read-host -prompt "Default Time Tracking Directory is $scriptDirectory. To change it please enter a new directory, otherwise hit enter."
if (-not $null -eq $newScriptDirectory) {
    $scriptDirectory = $newScriptDirectory
}

if (-not (Test-Path $scriptDirectory)) {
    new-item -itemtype Directory -Path $scriptDirectory -Force
}

## Create temp directory
if (-not (test-path "C:\Temp")) {
    new-item -ItemType Directory -path "C:\Temp" -force
}

##Install Excel Module
$module = Get-Module -Name ImportExcel -ListAvailable
if ($null -eq $module) {
    write-host "Installing Module ImportExcel to Current User scope"
    Install-Module -Name ImportExcel -scope CurrentUser
}

copy-item -path (join-path -path $PSScriptRoot -ChildPath $excelFileSrc) -Destination (join-path $scriptDirectory -ChildPath $excelFileDest)
copy-item -path (join-path -path $PSScriptRoot -childPath $scriptFileSrc) -Destination (join-path $scriptDirectory -ChildPath $scriptFileDest)

$scriptFileContents = (Get-Content (join-path $scriptDirectory -ChildPath $scriptFileDest))
$scriptFileContents[0] = '$CONTENT_FILE = "' + (get-item -path (join-path $scriptDirectory -ChildPath $excelFileDest)).FullName + '"'
$scriptFileContents | set-content -path (join-path -path $scriptDirectory -childPath $scriptFileDest) -Force

write-host "Save this command snippet to get a CSV copy of your time entries for the website into your clipboard:`n"
write-host "=========="
write-host "& '$(join-path $scriptDirectory -ChildPath $scriptFileDest)'  ; get-content C:\temp\time_entry.csv | set-clipboard"
write-host "==========`n"