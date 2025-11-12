# How This Works

I have an excel sheet I use to keep track of time entries. In there, I have it formatted to it can easily
be imported to ServiceNow via a TamperMonkey script.
Once I have all my time entries in the excel sheet, I run a powershell one-liner that converts relevant
data to CSV and puts it in my clipboard. Once in my clipboard I go to Daily Time, past the generated csv data,
then process each time entry into ServiceNow. All of the fields are typically filled in automatically, and any
adjustments can be made prior to hitting Save.

## Browser Setup

1. Install Tamper Monkey extension to chrome or edge. Firefox probably works too but haven't tested.
1. Click your Extensions icon in your browser and pin TamperMonkey
1. Right Click > Manage Extension
1. Choose any of these options you see (different options for different browsers):
   1. Allow user Scripts
   1. Developer Mode
1. Click on the Tamper Monkey extension and choose Create a New Script
1. Paste the script that is located at INSERTURL

## Excel Doc Setup

1. Download the Excel Document lotated at INSERTURL
1. Save it to a known location where you won't move it. This is important when running powershell to copy the data.
1. Edit the Active Projects tab.
   1. Put the Customer Name in Column A (as it shows in ServiceNOW)
   1. Put Project Name in Column B (as it shows in ServiceNOW)
   1. You can edit and use the rest of the columns as you like. I just added some more data for each project that was helpful
1. Ensure this formula is in all data rows in Column M `=TEXTSPLIT(TEXTJOIN(",",TRUE,FILTER('Active Projects'!B:B, 'Active Projects'!A:A=INDIRECT("B"&ROW()))),",")`
   1. This provides the drop down data validation for the Project Names in Column C

## Powershell Script Setup

This powershell script will copy all necessary data from the Time Tracking sheet where the Date field is populated.
Edit the powershell script line that looks like `$CONTENT_FILE = "C:\Users\jlake\OneDrive - Sentinel Technologies\Documents\Time Tracking Excel.xlsx"` matches the patch to the Excel sheet your time will be kept in.

# Creating Time Entries

If you have completed all the previous steps you should be ready to use the tools to record and upload your time entries.

## Add Time Entries to Excel

Fill out one line per time entry in the Excel sheet on the Time Tracking sheet. This only works for Work time.

## Get Data to Clipboard

Once you're ready to enter your time entries from excel to follow these steps:

1.  Close the Excel sheet. This is important or you will get an error when trying to run the powershell script.
2.  Run the powershell script as shown below. I saved the Powershell Script to `C:\users\jlake\OneDrive - Sentinel Technologies\Documents\Coding\TimeEntry-Tampermonkey\Get-TimeEntries.ps1` Update paths as necessary
    > & 'C:\users\jlake\OneDrive - Sentinel Technologies\Documents\Coding\TimeEntry-Tampermonkey\Get-TimeEntries.ps1' ; get-content C:\temp\time_entry.csv | set-clipboard
        1. I have a saved clip in Ditto Clipboard Manager that calls this powershell oneliner. Whatever is easiest for you to call the script works.

## Adding Time Entries into ServiceNOW

1. Browse to Daily Time.
1. You should see the Time Entry widget. Paste the data that came from your clipboard into the text area and hit Parse Data. It should show you how many Time Entries have been captured.
1. If you are on the main Daily Time screen where you have the option of clicking New to generate a new time entry, click New Entry in the widget. This calls the same action as clicking the native 'New' button in Daily Time.
1. This should bring you to the screen where you can enter your time.
1. Click Fill Form.
   1. This should update all the fields in Service Now. Keep an eye to make sure the default Business Unit is the correct Business Unit.
   1. Fix any fields that aren't correct.
1. Once everything is filled in and correct click Save Entry.
   1. This is the same as clicking the native 'Submit' button in Service Now. It also removes that time entry from the list and you should see you now have one less time entry in the list.
1. If you have a time entry you don't want to enter, clicking 'Mark Complete' removes it from the list without adding the time entry.
   1. If you accidentally remove one I don't have an easy way to add it back to the list at this time. You can either leave that time entry in your excel or just addit manually.
1. Follow the New Entry->Fill Form->Save process until you are done with your time entries.

# Managing Excel Document

**IMPORTANT NOTE** - Cut/Paste from the Time Entry sheet will remove data validation from fields. Use copy/paste then delete when moving entries to Archive sheet.

Once you have added your time entries you want to remove them from the Time Entry sheet. You can just delete them and start over, or what I do is copy them to the Archive sheet so I have them to go back to, and then delete from the Time Entry sheet.
