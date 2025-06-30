# Save as container-gui.ps1
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Create form
$form = New-Object System.Windows.Forms.Form
$form.Text = 'Docker Manager'
$form.Size = New-Object System.Drawing.Size(1200,750)  # 600 -> 750으로 증가
$form.StartPosition = 'CenterScreen'

# Create Container ListView
$containerListView = New-Object System.Windows.Forms.ListView
$containerListView.View = [System.Windows.Forms.View]::Details
$containerListView.Size = New-Object System.Drawing.Size(580,400)
$containerListView.Location = New-Object System.Drawing.Point(10,30)
$containerListView.FullRowSelect = $true

# Create Image ListView
$imageListView = New-Object System.Windows.Forms.ListView
$imageListView.View = [System.Windows.Forms.View]::Details
$imageListView.Size = New-Object System.Drawing.Size(580,400)
$imageListView.Location = New-Object System.Drawing.Point(600,30)
$imageListView.FullRowSelect = $true

# Create Labels
$containerLabel = New-Object System.Windows.Forms.Label
$containerLabel.Text = "Running Containers"
$containerLabel.Location = New-Object System.Drawing.Point(10,10)
$containerLabel.AutoSize = $true

$imageLabel = New-Object System.Windows.Forms.Label
$imageLabel.Text = "Available Images"
$imageLabel.Location = New-Object System.Drawing.Point(600,10)
$imageLabel.AutoSize = $true

# Create Buttons
$deleteAllContainersButton = New-Object System.Windows.Forms.Button
$deleteAllContainersButton.Text = "Delete All Containers"
$deleteAllContainersButton.Size = New-Object System.Drawing.Size(150,30)
$deleteAllContainersButton.Location = New-Object System.Drawing.Point(10,440)
$deleteAllContainersButton.BackColor = [System.Drawing.Color]::FromArgb(255, 200, 200)

$runImageButton = New-Object System.Windows.Forms.Button
$runImageButton.Text = "Run Selected Image"
$runImageButton.Size = New-Object System.Drawing.Size(150,30)
$runImageButton.Location = New-Object System.Drawing.Point(600,440)
$runImageButton.BackColor = [System.Drawing.Color]::FromArgb(200, 255, 200)

# Create Loading Panel
$loadingPanel = New-Object System.Windows.Forms.Panel
$loadingPanel.Size = $form.Size
$loadingPanel.Location = New-Object System.Drawing.Point(0,0)
$loadingPanel.BackColor = [System.Drawing.Color]::FromArgb(128, 255, 255, 255)
$loadingPanel.Visible = $false

$loadingLabel = New-Object System.Windows.Forms.Label
$loadingLabel.Text = "Processing..."
$loadingLabel.AutoSize = $true
$loadingLabel.Location = New-Object System.Drawing.Point(550,280)
$loadingLabel.Font = New-Object System.Drawing.Font("Arial", 12, [System.Drawing.FontStyle]::Bold)
$loadingPanel.Controls.Add($loadingLabel)

# Add columns
$containerListView.Columns.Add("Container ID", 100)
$containerListView.Columns.Add("Names", 150)
$containerListView.Columns.Add("Image", 150)
$containerListView.Columns.Add("Status", 100)
$containerListView.Columns.Add("Ports", 80)

$imageListView.Columns.Add("Image Name", 300)  # 380에서 300으로 조정
$imageListView.Columns.Add("Tag", 150)         # 200에서 150으로 조정
$imageListView.Columns.Add("Size", 130)        # 새로운 Size 열 추가

# Function to refresh container list
function RefreshContainers {
    $containerListView.Items.Clear()
    $containers = docker ps -a --format "{{.ID}}`t{{.Names}}`t{{.Image}}`t{{.Status}}`t{{.Ports}}"
    
    foreach ($container in $containers) {
        $containerInfo = $container -split "`t"
        $listItem = New-Object System.Windows.Forms.ListViewItem($containerInfo[0])
        $listItem.SubItems.Add($containerInfo[1])
        $listItem.SubItems.Add($containerInfo[2])
        $listItem.SubItems.Add($containerInfo[3])
        $listItem.SubItems.Add($containerInfo[4])
        $containerListView.Items.Add($listItem)
    }
}

# Function to refresh image list
function RefreshImages {
    $imageListView.Items.Clear()
    $images = docker images --format "{{.Repository}}`t{{.Tag}}`t{{.Size}}"
    
    foreach ($image in $images) {
        $imageInfo = $image -split "`t"
        $listItem = New-Object System.Windows.Forms.ListViewItem($imageInfo[0])
        $listItem.SubItems.Add($imageInfo[1])
        $listItem.SubItems.Add($imageInfo[2])
        $imageListView.Items.Add($listItem)
    }
}
# Initial load
RefreshContainers
RefreshImages

# Create Checkbox for showing console (새로 추가)
$showConsoleCheckbox = New-Object System.Windows.Forms.CheckBox
$showConsoleCheckbox.Text = "Show Console Log"
$showConsoleCheckbox.Size = New-Object System.Drawing.Size(120,30)
$showConsoleCheckbox.Location = New-Object System.Drawing.Point(760,440)
$showConsoleCheckbox.Checked = $false

# Create Refresh Button (새로 추가)
$refreshButton = New-Object System.Windows.Forms.Button
$refreshButton.Text = "↻ Refresh Lists"
$refreshButton.Size = New-Object System.Drawing.Size(150,30)
$refreshButton.Location = New-Object System.Drawing.Point(900,440)
$refreshButton.BackColor = [System.Drawing.Color]::FromArgb(200, 200, 255)

# Run Image Button Click Handler 수정
$runImageButton.Add_Click({
    if ($imageListView.SelectedItems.Count -eq 0) {
        [System.Windows.Forms.MessageBox]::Show(
            "Please select an image to run.",
            "Information"
        )
        return
    }

    $selectedImage = $imageListView.SelectedItems[0].Text + ":" + $imageListView.SelectedItems[0].SubItems[1].Text
    
    if ($showConsoleCheckbox.Checked) {
        # Run in visible console window
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "docker run $selectedImage"
        Start-Sleep -Seconds 2  # 컨테이너 시작 대기
    } else {
        # Show loading panel
        $loadingPanel.Visible = $true
        $form.Refresh()
        
        # Run container in background
        $output = docker run -d $selectedImage 2>&1
        
        # Hide loading panel
        $loadingPanel.Visible = $false
        
        [System.Windows.Forms.MessageBox]::Show(
            "Container started: $output",
            "Operation Complete"
        )
    }
    RefreshContainers
})
# Refresh Button Click Handler (새로 추가)
$refreshButton.Add_Click({
    $loadingPanel.Visible = $true
    $form.Refresh()
    RefreshContainers
    RefreshImages
    $loadingPanel.Visible = $false
})


# Delete All Containers Button Click Handler
$deleteAllContainersButton.Add_Click({
    $containerCount = $containerListView.Items.Count
    if ($containerCount -eq 0) {
        [System.Windows.Forms.MessageBox]::Show(
            "No containers to delete.",
            "Information"
        )
        return
    }

    $result = [System.Windows.Forms.MessageBox]::Show(
        "Are you sure you want to stop and remove all $containerCount containers?",
        "Confirm Delete All",
        [System.Windows.Forms.MessageBoxButtons]::YesNo
    )
    
    if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
        $loadingPanel.Visible = $true
        $form.Refresh()
        
        $output = ""
        foreach ($item in $containerListView.Items) {
            $containerId = $item.Text
            $output += docker stop $containerId 2>&1
            $output += "`n"
            $output += docker rm $containerId 2>&1
            $output += "`n"
        }
        
        $loadingPanel.Visible = $false
        
        [System.Windows.Forms.MessageBox]::Show(
            "Result:`n$output",
            "Operation Complete"
        )
        RefreshContainers
    }
})

# Container Double-click event handler
$containerListView.Add_DoubleClick({
    $selectedItem = $containerListView.SelectedItems[0]
    $containerId = $selectedItem.Text
    $containerName = $selectedItem.SubItems[1].Text
    
    $result = [System.Windows.Forms.MessageBox]::Show(
        "What would you like to do with container: $containerName ?`n`n[Yes] = Stop & Remove`n[No] = Stop only`n[Cancel] = Cancel",
        "Container Action",
        [System.Windows.Forms.MessageBoxButtons]::YesNoCancel
    )
    
    if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
        $loadingPanel.Visible = $true
        $form.Refresh()
        
        $output = docker stop $containerId 2>&1
        $output += docker rm $containerId 2>&1
        
        $loadingPanel.Visible = $false
        
        [System.Windows.Forms.MessageBox]::Show(
            "Result: $output",
            "Operation Complete"
        )
        RefreshContainers
    }
    elseif ($result -eq [System.Windows.Forms.DialogResult]::No) {
        $loadingPanel.Visible = $true
        $form.Refresh()
        
        $output = docker stop $containerId 2>&1
        
        $loadingPanel.Visible = $false
        
        [System.Windows.Forms.MessageBox]::Show(
            "Result: $output",
            "Operation Complete"
        )
        RefreshContainers
    }
})
# Create Delete All Images Button (새로 추가)
$deleteAllImagesButton = New-Object System.Windows.Forms.Button
$deleteAllImagesButton.Text = "Delete All Images"
$deleteAllImagesButton.Size = New-Object System.Drawing.Size(150,30)
$deleteAllImagesButton.Location = New-Object System.Drawing.Point(600,520)  # 480 -> 520으로 변경
$deleteAllImagesButton.BackColor = [System.Drawing.Color]::FromArgb(255, 200, 200)

# Image Double-click event handler (새로 추가)
$imageListView.Add_DoubleClick({
    $selectedItem = $imageListView.SelectedItems[0]
    $imageName = $selectedItem.Text
    $imageTag = $selectedItem.SubItems[1].Text
    $fullImageName = "$imageName`:$imageTag"
    
    $result = [System.Windows.Forms.MessageBox]::Show(
        "Do you want to delete image: $fullImageName ?",
        "Confirm Delete",
        [System.Windows.Forms.MessageBoxButtons]::YesNo
    )
    
    if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
        $loadingPanel.Visible = $true
        $form.Refresh()
        
        $output = docker rmi $fullImageName 2>&1
        
        $loadingPanel.Visible = $false
        
        [System.Windows.Forms.MessageBox]::Show(
            "Result: $output",
            "Operation Complete"
        )
        RefreshImages
    }
})

# Delete All Images Button Click Handler (새로 추가)
$deleteAllImagesButton.Add_Click({
    $imageCount = $imageListView.Items.Count
    if ($imageCount -eq 0) {
        [System.Windows.Forms.MessageBox]::Show(
            "No images to delete.",
            "Information"
        )
        return
    }

    $result = [System.Windows.Forms.MessageBox]::Show(
        "Are you sure you want to delete all $imageCount images?",
        "Confirm Delete All",
        [System.Windows.Forms.MessageBoxButtons]::YesNo
    )
    
    if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
        $loadingPanel.Visible = $true
        $form.Refresh()
        
        $output = ""
        foreach ($item in $imageListView.Items) {
            $imageName = $item.Text
            $imageTag = $item.SubItems[1].Text
            $fullImageName = "$imageName`:$imageTag"
            $output += docker rmi $fullImageName 2>&1
            $output += "`n"
        }
        
        $loadingPanel.Visible = $false
        
        [System.Windows.Forms.MessageBox]::Show(
            "Result:`n$output",
            "Operation Complete"
        )
        RefreshImages
    }
})




# Create Docker Compose Group Box (새로 추가)
$composeGroupBox = New-Object System.Windows.Forms.GroupBox
$composeGroupBox.Text = "Docker Compose"
$composeGroupBox.Size = New-Object System.Drawing.Size(1180,100)
$composeGroupBox.Location = New-Object System.Drawing.Point(10,580)  # 480 -> 580으로 변경

# Create Docker Compose File TextBox
$composeFileTextBox = New-Object System.Windows.Forms.TextBox
$composeFileTextBox.Size = New-Object System.Drawing.Size(800,23)
$composeFileTextBox.Location = New-Object System.Drawing.Point(10,25)
$composeFileTextBox.ReadOnly = $true

# Create Browse Button
$browseButton = New-Object System.Windows.Forms.Button
$browseButton.Text = "Browse"
$browseButton.Size = New-Object System.Drawing.Size(100,23)
$browseButton.Location = New-Object System.Drawing.Point(820,25)

# Create Compose Up Button
$composeUpButton = New-Object System.Windows.Forms.Button
$composeUpButton.Text = "Compose Up"
$composeUpButton.Size = New-Object System.Drawing.Size(120,23)
$composeUpButton.Location = New-Object System.Drawing.Point(930,25)
$composeUpButton.BackColor = [System.Drawing.Color]::FromArgb(200, 255, 200)

# Create Compose Down Button
$composeDownButton = New-Object System.Windows.Forms.Button
$composeDownButton.Text = "Compose Down"
$composeDownButton.Size = New-Object System.Drawing.Size(120,23)
$composeDownButton.Location = New-Object System.Drawing.Point(1050,25)
$composeDownButton.BackColor = [System.Drawing.Color]::FromArgb(255, 200, 200)

# Browse Button Click Handler
$browseButton.Add_Click({
    $openFileDialog = New-Object System.Windows.Forms.OpenFileDialog
    $openFileDialog.Filter = "YAML files (*.yml;*.yaml)|*.yml;*.yaml|All files (*.*)|*.*"
    $openFileDialog.Title = "Select Docker Compose File"
    
    # 현재 스크립트의 실행 경로를 초기 디렉토리로 설정
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    $openFileDialog.InitialDirectory = $scriptPath
    
    if ($openFileDialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $composeFileTextBox.Text = $openFileDialog.FileName
    }
})

# Compose Up Button Click Handler
$composeUpButton.Add_Click({
    if ([string]::IsNullOrEmpty($composeFileTextBox.Text)) {
        [System.Windows.Forms.MessageBox]::Show(
            "Please select a docker-compose file first.",
            "Information"
        )
        return
    }

    $composePath = Split-Path -Parent $composeFileTextBox.Text
    $composeFile = Split-Path -Leaf $composeFileTextBox.Text
    
    # 실시간 로그를 보여주기 위해 항상 새 콘솔 창에서 실행
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$composePath'; Write-Host 'Starting Docker Compose in: $composePath' -ForegroundColor Green; docker-compose -f '$composeFile' up"
    
    Start-Sleep -Seconds 2  # 컨테이너 시작 대기
    RefreshContainers
    RefreshImages
})

# Compose Down Button Click Handler
$composeDownButton.Add_Click({
    if ([string]::IsNullOrEmpty($composeFileTextBox.Text)) {
        [System.Windows.Forms.MessageBox]::Show(
            "Please select a docker-compose file first.",
            "Information"
        )
        return
    }

    $composePath = Split-Path -Parent $composeFileTextBox.Text
    $composeFile = Split-Path -Leaf $composeFileTextBox.Text
    
    $loadingPanel.Visible = $true
    $form.Refresh()
    
    try {
        Set-Location $composePath
        
        # docker-compose 관련 PowerShell 창 찾아서 종료
        $powershellProcesses = Get-Process powershell | Where-Object { 
            $_.MainWindowTitle -like "*docker-compose*" -or
            $_.MainWindowTitle -like "*$composeFile*"
        }
        
        # cmd 창 찾아서 종료 (docker-compose up 관련)
        $cmdProcesses = Get-Process cmd | Where-Object {
            $_.MainWindowTitle -like "*docker-compose*" -or 
            $_.MainWindowTitle -like "*$composeFile*"
        }
        
        # 모든 관련 프로세스 종료
        $processesToKill = @() + $powershellProcesses + $cmdProcesses
        if ($processesToKill) {
            foreach ($process in $processesToKill) {
                Stop-Process -Id $process.Id -Force
            }
        }

        # docker-compose down 실행
        $output = docker-compose -f $composeFile down 2>&1 | Out-String
        
        [System.Windows.Forms.MessageBox]::Show(
            "Docker Compose services have been stopped successfully.",
            "Operation Complete"
        )
    }
    catch {
        [System.Windows.Forms.MessageBox]::Show(
            "Error occurred: $_",
            "Error"
        )
    }
    finally {
        $loadingPanel.Visible = $false
        RefreshContainers
        RefreshImages
        RefreshNetworks
    }
})

# Add controls to GroupBox
$composeGroupBox.Controls.AddRange(@(
    $composeFileTextBox,
    $browseButton,
    $composeUpButton,
    $composeDownButton
))



# Add controls to form 수정
$form.Controls.AddRange(@(
    $containerListView,
    $imageListView,
    $containerLabel,
    $imageLabel,
    $deleteAllContainersButton,
    $runImageButton,
    $deleteAllImagesButton,
    $showConsoleCheckbox,
    $refreshButton,
    $composeGroupBox,    # 새로 추가
    $loadingPanel
))

# Show form
$form.ShowDialog()  # 이 줄이 반드시 필요합니다