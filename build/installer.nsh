; Enregistre Fire Shox comme navigateur auprès de Windows (Paramètres > Applications par défaut),
; comme Chrome ou Edge. Installation par utilisateur : tout va dans HKCU.

!macro customInstall
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\FireShox" "" "Fire Shox"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\FireShox\DefaultIcon" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\FireShox\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}"'
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\FireShox\Capabilities" "ApplicationName" "Fire Shox"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\FireShox\Capabilities" "ApplicationIcon" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\FireShox\Capabilities" "ApplicationDescription" "Le navigateur à amorti gravitationnel. 100% incandescent."
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\FireShox\Capabilities\URLAssociations" "http" "FireShoxURL"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\FireShox\Capabilities\URLAssociations" "https" "FireShoxURL"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\FireShox\Capabilities\FileAssociations" ".htm" "FireShoxHTML"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\FireShox\Capabilities\FileAssociations" ".html" "FireShoxHTML"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\FireShox\Capabilities\FileAssociations" ".pdf" "FireShoxHTML"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\FireShox\Capabilities\StartMenu" "StartMenuInternet" "FireShox"
  WriteRegStr HKCU "Software\RegisteredApplications" "Fire Shox" "Software\Clients\StartMenuInternet\FireShox\Capabilities"

  WriteRegStr HKCU "Software\Classes\FireShoxURL" "" "Fire Shox URL"
  WriteRegStr HKCU "Software\Classes\FireShoxURL" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\FireShoxURL\DefaultIcon" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr HKCU "Software\Classes\FireShoxURL\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'

  WriteRegStr HKCU "Software\Classes\FireShoxHTML" "" "Document Fire Shox"
  WriteRegStr HKCU "Software\Classes\FireShoxHTML\DefaultIcon" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr HKCU "Software\Classes\FireShoxHTML\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Clients\StartMenuInternet\FireShox"
  DeleteRegValue HKCU "Software\RegisteredApplications" "Fire Shox"
  DeleteRegKey HKCU "Software\Classes\FireShoxURL"
  DeleteRegKey HKCU "Software\Classes\FireShoxHTML"
!macroend
