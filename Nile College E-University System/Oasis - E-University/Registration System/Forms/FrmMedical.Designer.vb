<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class FrmMedical
    Inherits System.Windows.Forms.Form

    'Form overrides dispose to clean up the component list.
    <System.Diagnostics.DebuggerNonUserCode()> _
    Protected Overrides Sub Dispose(ByVal disposing As Boolean)
        Try
            If disposing AndAlso components IsNot Nothing Then
                components.Dispose()
            End If
        Finally
            MyBase.Dispose(disposing)
        End Try
    End Sub

    'Required by the Windows Form Designer
    Private components As System.ComponentModel.IContainer

    'NOTE: The following procedure is required by the Windows Form Designer
    'It can be modified using the Windows Form Designer.  
    'Do not modify it using the code editor.
    <System.Diagnostics.DebuggerStepThrough()> _
    Private Sub InitializeComponent()
        Me.components = New System.ComponentModel.Container()
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(FrmMedical))
        Me.DTPDateofMedicalExamination = New System.Windows.Forms.DateTimePicker()
        Me.Label21 = New System.Windows.Forms.Label()
        Me.CombBloodType = New System.Windows.Forms.ComboBox()
        Me.Label1 = New System.Windows.Forms.Label()
        Me.GroupBox4 = New System.Windows.Forms.GroupBox()
        Me.CombColeg = New System.Windows.Forms.ComboBox()
        Me.CombProgram = New System.Windows.Forms.ComboBox()
        Me.Label12 = New System.Windows.Forms.Label()
        Me.Label11 = New System.Windows.Forms.Label()
        Me.Label6 = New System.Windows.Forms.Label()
        Me.Label2 = New System.Windows.Forms.Label()
        Me.Label3 = New System.Windows.Forms.Label()
        Me.Label4 = New System.Windows.Forms.Label()
        Me.TxtForAr = New System.Windows.Forms.TextBox()
        Me.TxtTHAr = New System.Windows.Forms.TextBox()
        Me.TxtSAr = New System.Windows.Forms.TextBox()
        Me.TxtFAR = New System.Windows.Forms.TextBox()
        Me.Button1 = New System.Windows.Forms.Button()
        Me.Label5 = New System.Windows.Forms.Label()
        Me.txtUniversityID = New System.Windows.Forms.TextBox()
        Me.GroupBox1 = New System.Windows.Forms.GroupBox()
        Me.Label8 = New System.Windows.Forms.Label()
        Me.Label7 = New System.Windows.Forms.Label()
        Me.CombHepatitis = New System.Windows.Forms.ComboBox()
        Me.CombAids = New System.Windows.Forms.ComboBox()
        Me.BtnSave = New System.Windows.Forms.Button()
        Me.BtnClose = New System.Windows.Forms.Button()
        Me.BtnClear = New System.Windows.Forms.Button()
        Me.ErrProvider = New System.Windows.Forms.ErrorProvider(Me.components)
        Me.GroupBox4.SuspendLayout()
        Me.GroupBox1.SuspendLayout()
        CType(Me.ErrProvider, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.SuspendLayout()
        '
        'DTPDateofMedicalExamination
        '
        Me.DTPDateofMedicalExamination.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.DTPDateofMedicalExamination.CustomFormat = "dd/MM/yyyy"
        Me.DTPDateofMedicalExamination.Format = System.Windows.Forms.DateTimePickerFormat.Custom
        Me.DTPDateofMedicalExamination.Location = New System.Drawing.Point(550, 66)
        Me.DTPDateofMedicalExamination.Name = "DTPDateofMedicalExamination"
        Me.DTPDateofMedicalExamination.RightToLeftLayout = True
        Me.DTPDateofMedicalExamination.Size = New System.Drawing.Size(163, 20)
        Me.DTPDateofMedicalExamination.TabIndex = 53
        '
        'Label21
        '
        Me.Label21.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label21.AutoSize = True
        Me.Label21.Location = New System.Drawing.Point(719, 70)
        Me.Label21.Name = "Label21"
        Me.Label21.Size = New System.Drawing.Size(35, 13)
        Me.Label21.TabIndex = 51
        Me.Label21.Text = "التاريخ"
        '
        'CombBloodType
        '
        Me.CombBloodType.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.CombBloodType.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombBloodType.FormattingEnabled = True
        Me.CombBloodType.Items.AddRange(New Object() {"+A", "+B", "+AB", "+O", "-A", "-B", "-AB", "-O"})
        Me.CombBloodType.Location = New System.Drawing.Point(891, 53)
        Me.CombBloodType.Name = "CombBloodType"
        Me.CombBloodType.Size = New System.Drawing.Size(222, 21)
        Me.CombBloodType.TabIndex = 97
        '
        'Label1
        '
        Me.Label1.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label1.AutoSize = True
        Me.Label1.Location = New System.Drawing.Point(1119, 56)
        Me.Label1.Name = "Label1"
        Me.Label1.Size = New System.Drawing.Size(61, 13)
        Me.Label1.TabIndex = 98
        Me.Label1.Text = "فصيلة الدم:"
        '
        'GroupBox4
        '
        Me.GroupBox4.Anchor = CType(((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox4.Controls.Add(Me.CombColeg)
        Me.GroupBox4.Controls.Add(Me.CombProgram)
        Me.GroupBox4.Controls.Add(Me.Label12)
        Me.GroupBox4.Controls.Add(Me.Label11)
        Me.GroupBox4.Controls.Add(Me.Label6)
        Me.GroupBox4.Controls.Add(Me.Label2)
        Me.GroupBox4.Controls.Add(Me.Label3)
        Me.GroupBox4.Controls.Add(Me.Label4)
        Me.GroupBox4.Controls.Add(Me.TxtForAr)
        Me.GroupBox4.Controls.Add(Me.TxtTHAr)
        Me.GroupBox4.Controls.Add(Me.TxtSAr)
        Me.GroupBox4.Controls.Add(Me.TxtFAR)
        Me.GroupBox4.Controls.Add(Me.Label21)
        Me.GroupBox4.Controls.Add(Me.DTPDateofMedicalExamination)
        Me.GroupBox4.Location = New System.Drawing.Point(6, 53)
        Me.GroupBox4.Name = "GroupBox4"
        Me.GroupBox4.Size = New System.Drawing.Size(1182, 105)
        Me.GroupBox4.TabIndex = 103
        Me.GroupBox4.TabStop = False
        Me.GroupBox4.Text = "بيانات الطالب"
        '
        'CombColeg
        '
        Me.CombColeg.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.CombColeg.Enabled = False
        Me.CombColeg.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.CombColeg.FormattingEnabled = True
        Me.CombColeg.Items.AddRange(New Object() {"نظم المعلومات", "علوم الحاسوب", "الهندسة", "التمريض"})
        Me.CombColeg.Location = New System.Drawing.Point(978, 66)
        Me.CombColeg.Name = "CombColeg"
        Me.CombColeg.Size = New System.Drawing.Size(161, 22)
        Me.CombColeg.TabIndex = 47
        '
        'CombProgram
        '
        Me.CombProgram.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.CombProgram.Enabled = False
        Me.CombProgram.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.CombProgram.FormattingEnabled = True
        Me.CombProgram.Items.AddRange(New Object() {"تقنية المعلومات"})
        Me.CombProgram.Location = New System.Drawing.Point(760, 66)
        Me.CombProgram.Name = "CombProgram"
        Me.CombProgram.Size = New System.Drawing.Size(163, 22)
        Me.CombProgram.TabIndex = 48
        '
        'Label12
        '
        Me.Label12.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label12.AutoSize = True
        Me.Label12.Location = New System.Drawing.Point(514, 34)
        Me.Label12.Name = "Label12"
        Me.Label12.Size = New System.Drawing.Size(30, 13)
        Me.Label12.TabIndex = 49
        Me.Label12.Text = "الرابع"
        '
        'Label11
        '
        Me.Label11.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label11.AutoSize = True
        Me.Label11.Location = New System.Drawing.Point(719, 34)
        Me.Label11.Name = "Label11"
        Me.Label11.Size = New System.Drawing.Size(33, 13)
        Me.Label11.TabIndex = 49
        Me.Label11.Text = "الثالث"
        '
        'Label6
        '
        Me.Label6.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label6.AutoSize = True
        Me.Label6.Location = New System.Drawing.Point(936, 34)
        Me.Label6.Name = "Label6"
        Me.Label6.Size = New System.Drawing.Size(34, 13)
        Me.Label6.TabIndex = 49
        Me.Label6.Text = "الثاني"
        '
        'Label2
        '
        Me.Label2.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label2.AutoSize = True
        Me.Label2.Location = New System.Drawing.Point(1146, 34)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(36, 26)
        Me.Label2.TabIndex = 49
        Me.Label2.Text = "الاسم" & Global.Microsoft.VisualBasic.ChrW(13) & Global.Microsoft.VisualBasic.ChrW(10) & " الاول"
        '
        'Label3
        '
        Me.Label3.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label3.AutoSize = True
        Me.Label3.Location = New System.Drawing.Point(1146, 70)
        Me.Label3.Name = "Label3"
        Me.Label3.Size = New System.Drawing.Size(33, 13)
        Me.Label3.TabIndex = 49
        Me.Label3.Text = "الكلية"
        '
        'Label4
        '
        Me.Label4.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label4.AutoSize = True
        Me.Label4.Location = New System.Drawing.Point(929, 70)
        Me.Label4.Name = "Label4"
        Me.Label4.Size = New System.Drawing.Size(42, 13)
        Me.Label4.TabIndex = 50
        Me.Label4.Text = "البرنامج"
        '
        'TxtForAr
        '
        Me.TxtForAr.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.TxtForAr.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.TxtForAr.Enabled = False
        Me.TxtForAr.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.TxtForAr.ForeColor = System.Drawing.Color.Black
        Me.TxtForAr.Location = New System.Drawing.Point(349, 31)
        Me.TxtForAr.Name = "TxtForAr"
        Me.TxtForAr.Size = New System.Drawing.Size(163, 22)
        Me.TxtForAr.TabIndex = 41
        Me.TxtForAr.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'TxtTHAr
        '
        Me.TxtTHAr.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.TxtTHAr.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.TxtTHAr.Enabled = False
        Me.TxtTHAr.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.TxtTHAr.ForeColor = System.Drawing.Color.Black
        Me.TxtTHAr.Location = New System.Drawing.Point(550, 31)
        Me.TxtTHAr.Name = "TxtTHAr"
        Me.TxtTHAr.Size = New System.Drawing.Size(163, 22)
        Me.TxtTHAr.TabIndex = 40
        Me.TxtTHAr.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'TxtSAr
        '
        Me.TxtSAr.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.TxtSAr.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.TxtSAr.Enabled = False
        Me.TxtSAr.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.TxtSAr.ForeColor = System.Drawing.Color.Black
        Me.TxtSAr.Location = New System.Drawing.Point(760, 31)
        Me.TxtSAr.Name = "TxtSAr"
        Me.TxtSAr.Size = New System.Drawing.Size(163, 22)
        Me.TxtSAr.TabIndex = 39
        Me.TxtSAr.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'TxtFAR
        '
        Me.TxtFAR.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.TxtFAR.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.TxtFAR.Enabled = False
        Me.TxtFAR.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.TxtFAR.ForeColor = System.Drawing.Color.Black
        Me.TxtFAR.Location = New System.Drawing.Point(976, 31)
        Me.TxtFAR.Name = "TxtFAR"
        Me.TxtFAR.Size = New System.Drawing.Size(163, 22)
        Me.TxtFAR.TabIndex = 38
        Me.TxtFAR.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Button1
        '
        Me.Button1.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Button1.Location = New System.Drawing.Point(778, 21)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 28)
        Me.Button1.TabIndex = 102
        Me.Button1.Text = "بحث"
        Me.Button1.UseVisualStyleBackColor = True
        '
        'Label5
        '
        Me.Label5.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label5.AutoSize = True
        Me.Label5.Location = New System.Drawing.Point(1109, 27)
        Me.Label5.Name = "Label5"
        Me.Label5.Size = New System.Drawing.Size(73, 13)
        Me.Label5.TabIndex = 101
        Me.Label5.Text = "الرقم الجامعى"
        '
        'txtUniversityID
        '
        Me.txtUniversityID.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtUniversityID.BackColor = System.Drawing.Color.Black
        Me.txtUniversityID.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtUniversityID.Font = New System.Drawing.Font("Tahoma", 9.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtUniversityID.ForeColor = System.Drawing.Color.LawnGreen
        Me.txtUniversityID.Location = New System.Drawing.Point(859, 25)
        Me.txtUniversityID.Name = "txtUniversityID"
        Me.txtUniversityID.RightToLeft = System.Windows.Forms.RightToLeft.No
        Me.txtUniversityID.Size = New System.Drawing.Size(244, 23)
        Me.txtUniversityID.TabIndex = 100
        Me.txtUniversityID.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'GroupBox1
        '
        Me.GroupBox1.Anchor = CType(((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox1.Controls.Add(Me.Label8)
        Me.GroupBox1.Controls.Add(Me.Label7)
        Me.GroupBox1.Controls.Add(Me.Label1)
        Me.GroupBox1.Controls.Add(Me.CombHepatitis)
        Me.GroupBox1.Controls.Add(Me.CombAids)
        Me.GroupBox1.Controls.Add(Me.CombBloodType)
        Me.GroupBox1.Location = New System.Drawing.Point(6, 156)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(1182, 81)
        Me.GroupBox1.TabIndex = 103
        Me.GroupBox1.TabStop = False
        Me.GroupBox1.Text = "الفحوصات"
        '
        'Label8
        '
        Me.Label8.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label8.AutoSize = True
        Me.Label8.Location = New System.Drawing.Point(838, 24)
        Me.Label8.Name = "Label8"
        Me.Label8.Size = New System.Drawing.Size(34, 13)
        Me.Label8.TabIndex = 49
        Me.Label8.Text = "الايدز:"
        '
        'Label7
        '
        Me.Label7.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label7.AutoSize = True
        Me.Label7.Location = New System.Drawing.Point(1118, 22)
        Me.Label7.Name = "Label7"
        Me.Label7.Size = New System.Drawing.Size(67, 13)
        Me.Label7.TabIndex = 49
        Me.Label7.Text = "الكبد الوبائي:"
        '
        'CombHepatitis
        '
        Me.CombHepatitis.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.CombHepatitis.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombHepatitis.FormattingEnabled = True
        Me.CombHepatitis.Items.AddRange(New Object() {"A", "B", "C", "D", "E", "Negative"})
        Me.CombHepatitis.Location = New System.Drawing.Point(891, 19)
        Me.CombHepatitis.Name = "CombHepatitis"
        Me.CombHepatitis.Size = New System.Drawing.Size(222, 21)
        Me.CombHepatitis.TabIndex = 97
        '
        'CombAids
        '
        Me.CombAids.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.CombAids.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombAids.FormattingEnabled = True
        Me.CombAids.Items.AddRange(New Object() {"Positive", "Negative"})
        Me.CombAids.Location = New System.Drawing.Point(610, 21)
        Me.CombAids.Name = "CombAids"
        Me.CombAids.Size = New System.Drawing.Size(222, 21)
        Me.CombAids.TabIndex = 97
        '
        'BtnSave
        '
        Me.BtnSave.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left), System.Windows.Forms.AnchorStyles)
        Me.BtnSave.Location = New System.Drawing.Point(181, 380)
        Me.BtnSave.Name = "BtnSave"
        Me.BtnSave.Size = New System.Drawing.Size(75, 28)
        Me.BtnSave.TabIndex = 104
        Me.BtnSave.Text = "حفظ"
        Me.BtnSave.UseVisualStyleBackColor = True
        '
        'BtnClose
        '
        Me.BtnClose.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left), System.Windows.Forms.AnchorStyles)
        Me.BtnClose.Location = New System.Drawing.Point(19, 380)
        Me.BtnClose.Name = "BtnClose"
        Me.BtnClose.Size = New System.Drawing.Size(75, 28)
        Me.BtnClose.TabIndex = 106
        Me.BtnClose.Text = "إغلاق"
        Me.BtnClose.UseVisualStyleBackColor = True
        '
        'BtnClear
        '
        Me.BtnClear.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left), System.Windows.Forms.AnchorStyles)
        Me.BtnClear.Location = New System.Drawing.Point(100, 380)
        Me.BtnClear.Name = "BtnClear"
        Me.BtnClear.Size = New System.Drawing.Size(75, 28)
        Me.BtnClear.TabIndex = 105
        Me.BtnClear.Text = "مسح"
        Me.BtnClear.UseVisualStyleBackColor = True
        '
        'ErrProvider
        '
        Me.ErrProvider.ContainerControl = Me
        '
        'FrmMedical
        '
        Me.AcceptButton = Me.Button1
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(1200, 442)
        Me.Controls.Add(Me.BtnClose)
        Me.Controls.Add(Me.BtnClear)
        Me.Controls.Add(Me.BtnSave)
        Me.Controls.Add(Me.GroupBox1)
        Me.Controls.Add(Me.GroupBox4)
        Me.Controls.Add(Me.Button1)
        Me.Controls.Add(Me.Label5)
        Me.Controls.Add(Me.txtUniversityID)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.Name = "FrmMedical"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "الكشف الطبي"
        Me.WindowState = System.Windows.Forms.FormWindowState.Maximized
        Me.GroupBox4.ResumeLayout(False)
        Me.GroupBox4.PerformLayout()
        Me.GroupBox1.ResumeLayout(False)
        Me.GroupBox1.PerformLayout()
        CType(Me.ErrProvider, System.ComponentModel.ISupportInitialize).EndInit()
        Me.ResumeLayout(False)
        Me.PerformLayout()

    End Sub
    Friend WithEvents DTPDateofMedicalExamination As System.Windows.Forms.DateTimePicker
    Friend WithEvents Label21 As System.Windows.Forms.Label
    Friend WithEvents CombBloodType As System.Windows.Forms.ComboBox
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents GroupBox4 As System.Windows.Forms.GroupBox
    Friend WithEvents TxtForAr As System.Windows.Forms.TextBox
    Friend WithEvents TxtTHAr As System.Windows.Forms.TextBox
    Friend WithEvents TxtSAr As System.Windows.Forms.TextBox
    Friend WithEvents TxtFAR As System.Windows.Forms.TextBox
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents Label5 As System.Windows.Forms.Label
    Friend WithEvents txtUniversityID As System.Windows.Forms.TextBox
    Friend WithEvents CombColeg As System.Windows.Forms.ComboBox
    Friend WithEvents CombProgram As System.Windows.Forms.ComboBox
    Friend WithEvents Label3 As System.Windows.Forms.Label
    Friend WithEvents Label4 As System.Windows.Forms.Label
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents Label8 As System.Windows.Forms.Label
    Friend WithEvents Label7 As System.Windows.Forms.Label
    Friend WithEvents BtnSave As System.Windows.Forms.Button
    Friend WithEvents BtnClose As System.Windows.Forms.Button
    Friend WithEvents BtnClear As System.Windows.Forms.Button
    Friend WithEvents Label12 As System.Windows.Forms.Label
    Friend WithEvents Label11 As System.Windows.Forms.Label
    Friend WithEvents Label6 As System.Windows.Forms.Label
    Friend WithEvents Label2 As System.Windows.Forms.Label
    Friend WithEvents CombHepatitis As System.Windows.Forms.ComboBox
    Friend WithEvents CombAids As System.Windows.Forms.ComboBox
    Friend WithEvents ErrProvider As System.Windows.Forms.ErrorProvider
End Class
