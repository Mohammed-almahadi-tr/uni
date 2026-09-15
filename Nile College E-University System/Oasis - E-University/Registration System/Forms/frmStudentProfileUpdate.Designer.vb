<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frmStudentProfileUpdate
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
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmStudentProfileUpdate))
        Me.GroupBox1 = New System.Windows.Forms.GroupBox()
        Me.combNationality = New System.Windows.Forms.ComboBox()
        Me.Label9 = New System.Windows.Forms.Label()
        Me.Label8 = New System.Windows.Forms.Label()
        Me.txtWrittenValue = New System.Windows.Forms.TextBox()
        Me.txtTutionFee = New System.Windows.Forms.TextBox()
        Me.Label7 = New System.Windows.Forms.Label()
        Me.CombBatch = New System.Windows.Forms.ComboBox()
        Me.Label4 = New System.Windows.Forms.Label()
        Me.txtStdName = New System.Windows.Forms.TextBox()
        Me.txtStdPhone = New System.Windows.Forms.TextBox()
        Me.Label11 = New System.Windows.Forms.Label()
        Me.Label6 = New System.Windows.Forms.Label()
        Me.Label1 = New System.Windows.Forms.Label()
        Me.txtStdIndex = New System.Windows.Forms.TextBox()
        Me.Label3 = New System.Windows.Forms.Label()
        Me.Label2 = New System.Windows.Forms.Label()
        Me.CombProgram = New System.Windows.Forms.ComboBox()
        Me.txtStdAddress = New System.Windows.Forms.TextBox()
        Me.Button1 = New System.Windows.Forms.Button()
        Me.Button2 = New System.Windows.Forms.Button()
        Me.GroupBox4 = New System.Windows.Forms.GroupBox()
        Me.ErrProvider = New System.Windows.Forms.ErrorProvider(Me.components)
        Me.Label43 = New System.Windows.Forms.Label()
        Me.CmbAdmiTyp = New System.Windows.Forms.ComboBox()
        Me.Label13 = New System.Windows.Forms.Label()
        Me.CombType = New System.Windows.Forms.ComboBox()
        Me.Button3 = New System.Windows.Forms.Button()
        Me.GroupBox1.SuspendLayout()
        CType(Me.ErrProvider, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.SuspendLayout()
        '
        'GroupBox1
        '
        Me.GroupBox1.Controls.Add(Me.Button3)
        Me.GroupBox1.Controls.Add(Me.Label43)
        Me.GroupBox1.Controls.Add(Me.CmbAdmiTyp)
        Me.GroupBox1.Controls.Add(Me.Label13)
        Me.GroupBox1.Controls.Add(Me.CombType)
        Me.GroupBox1.Controls.Add(Me.combNationality)
        Me.GroupBox1.Controls.Add(Me.Label9)
        Me.GroupBox1.Controls.Add(Me.Label8)
        Me.GroupBox1.Controls.Add(Me.txtWrittenValue)
        Me.GroupBox1.Controls.Add(Me.txtTutionFee)
        Me.GroupBox1.Controls.Add(Me.Label7)
        Me.GroupBox1.Controls.Add(Me.CombBatch)
        Me.GroupBox1.Controls.Add(Me.Label4)
        Me.GroupBox1.Controls.Add(Me.txtStdName)
        Me.GroupBox1.Controls.Add(Me.txtStdPhone)
        Me.GroupBox1.Controls.Add(Me.Label11)
        Me.GroupBox1.Controls.Add(Me.Label6)
        Me.GroupBox1.Controls.Add(Me.Label1)
        Me.GroupBox1.Controls.Add(Me.txtStdIndex)
        Me.GroupBox1.Controls.Add(Me.Label3)
        Me.GroupBox1.Controls.Add(Me.Label2)
        Me.GroupBox1.Controls.Add(Me.CombProgram)
        Me.GroupBox1.Controls.Add(Me.txtStdAddress)
        Me.GroupBox1.Location = New System.Drawing.Point(6, 4)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(778, 189)
        Me.GroupBox1.TabIndex = 39
        Me.GroupBox1.TabStop = False
        '
        'combNationality
        '
        Me.combNationality.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.combNationality.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.combNationality.FormattingEnabled = True
        Me.combNationality.Location = New System.Drawing.Point(231, 71)
        Me.combNationality.Name = "combNationality"
        Me.combNationality.Size = New System.Drawing.Size(150, 21)
        Me.combNationality.TabIndex = 50
        '
        'Label9
        '
        Me.Label9.AutoSize = True
        Me.Label9.Location = New System.Drawing.Point(494, 132)
        Me.Label9.Name = "Label9"
        Me.Label9.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label9.Size = New System.Drawing.Size(36, 13)
        Me.Label9.TabIndex = 50
        Me.Label9.Text = "كتابتاً :"
        '
        'Label8
        '
        Me.Label8.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label8.AutoSize = True
        Me.Label8.Location = New System.Drawing.Point(387, 76)
        Me.Label8.Name = "Label8"
        Me.Label8.Size = New System.Drawing.Size(53, 13)
        Me.Label8.TabIndex = 49
        Me.Label8.Text = "الجنسية :"
        '
        'txtWrittenValue
        '
        Me.txtWrittenValue.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtWrittenValue.Location = New System.Drawing.Point(19, 130)
        Me.txtWrittenValue.Multiline = True
        Me.txtWrittenValue.Name = "txtWrittenValue"
        Me.txtWrittenValue.ReadOnly = True
        Me.txtWrittenValue.Size = New System.Drawing.Size(469, 45)
        Me.txtWrittenValue.TabIndex = 49
        '
        'txtTutionFee
        '
        Me.txtTutionFee.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtTutionFee.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtTutionFee.Location = New System.Drawing.Point(549, 128)
        Me.txtTutionFee.Name = "txtTutionFee"
        Me.txtTutionFee.Size = New System.Drawing.Size(125, 20)
        Me.txtTutionFee.TabIndex = 47
        '
        'Label7
        '
        Me.Label7.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label7.AutoSize = True
        Me.Label7.Location = New System.Drawing.Point(679, 132)
        Me.Label7.Name = "Label7"
        Me.Label7.Size = New System.Drawing.Size(91, 13)
        Me.Label7.TabIndex = 48
        Me.Label7.Text = "الرسوم الدراسية :"
        '
        'CombBatch
        '
        Me.CombBatch.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombBatch.FormattingEnabled = True
        Me.CombBatch.Location = New System.Drawing.Point(19, 44)
        Me.CombBatch.Name = "CombBatch"
        Me.CombBatch.Size = New System.Drawing.Size(135, 21)
        Me.CombBatch.TabIndex = 36
        '
        'Label4
        '
        Me.Label4.AutoSize = True
        Me.Label4.Location = New System.Drawing.Point(160, 47)
        Me.Label4.Name = "Label4"
        Me.Label4.Size = New System.Drawing.Size(43, 13)
        Me.Label4.TabIndex = 35
        Me.Label4.Text = "الدفعة :"
        '
        'txtStdName
        '
        Me.txtStdName.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtStdName.Location = New System.Drawing.Point(448, 44)
        Me.txtStdName.Name = "txtStdName"
        Me.txtStdName.Size = New System.Drawing.Size(227, 20)
        Me.txtStdName.TabIndex = 2
        '
        'txtStdPhone
        '
        Me.txtStdPhone.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtStdPhone.Location = New System.Drawing.Point(549, 72)
        Me.txtStdPhone.Name = "txtStdPhone"
        Me.txtStdPhone.Size = New System.Drawing.Size(126, 20)
        Me.txtStdPhone.TabIndex = 5
        '
        'Label11
        '
        Me.Label11.AutoSize = True
        Me.Label11.Location = New System.Drawing.Point(681, 76)
        Me.Label11.Name = "Label11"
        Me.Label11.Size = New System.Drawing.Size(85, 13)
        Me.Label11.TabIndex = 19
        Me.Label11.Text = "وظيفة ولي الامر:"
        '
        'Label6
        '
        Me.Label6.AutoSize = True
        Me.Label6.Location = New System.Drawing.Point(681, 22)
        Me.Label6.Name = "Label6"
        Me.Label6.Size = New System.Drawing.Size(80, 13)
        Me.Label6.TabIndex = 34
        Me.Label6.Text = "الرقم الجامعي :"
        '
        'Label1
        '
        Me.Label1.AutoSize = True
        Me.Label1.Location = New System.Drawing.Point(387, 48)
        Me.Label1.Name = "Label1"
        Me.Label1.Size = New System.Drawing.Size(49, 13)
        Me.Label1.TabIndex = 0
        Me.Label1.Text = "البرنامج :"
        '
        'txtStdIndex
        '
        Me.txtStdIndex.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtStdIndex.Location = New System.Drawing.Point(549, 19)
        Me.txtStdIndex.Name = "txtStdIndex"
        Me.txtStdIndex.Size = New System.Drawing.Size(126, 20)
        Me.txtStdIndex.TabIndex = 0
        Me.txtStdIndex.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label3
        '
        Me.Label3.AutoSize = True
        Me.Label3.Location = New System.Drawing.Point(681, 47)
        Me.Label3.Name = "Label3"
        Me.Label3.Size = New System.Drawing.Size(69, 13)
        Me.Label3.TabIndex = 5
        Me.Label3.Text = "إسم الطالب :"
        '
        'Label2
        '
        Me.Label2.AutoSize = True
        Me.Label2.Location = New System.Drawing.Point(681, 101)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(70, 13)
        Me.Label2.TabIndex = 12
        Me.Label2.Text = "عنوان الطالب:"
        '
        'CombProgram
        '
        Me.CombProgram.AutoCompleteCustomSource.AddRange(New String() {""})
        Me.CombProgram.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombProgram.ForeColor = System.Drawing.SystemColors.WindowText
        Me.CombProgram.FormattingEnabled = True
        Me.CombProgram.Location = New System.Drawing.Point(231, 44)
        Me.CombProgram.Name = "CombProgram"
        Me.CombProgram.Size = New System.Drawing.Size(150, 21)
        Me.CombProgram.TabIndex = 3
        '
        'txtStdAddress
        '
        Me.txtStdAddress.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtStdAddress.Location = New System.Drawing.Point(231, 98)
        Me.txtStdAddress.Multiline = True
        Me.txtStdAddress.Name = "txtStdAddress"
        Me.txtStdAddress.Size = New System.Drawing.Size(444, 20)
        Me.txtStdAddress.TabIndex = 6
        '
        'Button1
        '
        Me.Button1.Location = New System.Drawing.Point(25, 216)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 32)
        Me.Button1.TabIndex = 42
        Me.Button1.Text = "خروج"
        Me.Button1.UseVisualStyleBackColor = True
        '
        'Button2
        '
        Me.Button2.Location = New System.Drawing.Point(138, 216)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(75, 32)
        Me.Button2.TabIndex = 40
        Me.Button2.Text = "حفظ"
        Me.Button2.UseVisualStyleBackColor = True
        '
        'GroupBox4
        '
        Me.GroupBox4.Location = New System.Drawing.Point(6, 197)
        Me.GroupBox4.Name = "GroupBox4"
        Me.GroupBox4.Size = New System.Drawing.Size(778, 8)
        Me.GroupBox4.TabIndex = 43
        Me.GroupBox4.TabStop = False
        '
        'ErrProvider
        '
        Me.ErrProvider.ContainerControl = Me
        '
        'Label43
        '
        Me.Label43.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label43.AutoSize = True
        Me.Label43.Location = New System.Drawing.Point(160, 74)
        Me.Label43.Name = "Label43"
        Me.Label43.Size = New System.Drawing.Size(33, 13)
        Me.Label43.TabIndex = 107
        Me.Label43.Text = "النوع:"
        '
        'CmbAdmiTyp
        '
        Me.CmbAdmiTyp.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.CmbAdmiTyp.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CmbAdmiTyp.FormattingEnabled = True
        Me.CmbAdmiTyp.Items.AddRange(New Object() {"قبول عام", "قبول خاص", "ابناء عاملين", "وافدين"})
        Me.CmbAdmiTyp.Location = New System.Drawing.Point(19, 97)
        Me.CmbAdmiTyp.Name = "CmbAdmiTyp"
        Me.CmbAdmiTyp.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.CmbAdmiTyp.Size = New System.Drawing.Size(135, 21)
        Me.CmbAdmiTyp.TabIndex = 104
        '
        'Label13
        '
        Me.Label13.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label13.AutoSize = True
        Me.Label13.Location = New System.Drawing.Point(160, 101)
        Me.Label13.Name = "Label13"
        Me.Label13.Size = New System.Drawing.Size(53, 13)
        Me.Label13.TabIndex = 105
        Me.Label13.Text = "نوع القبول"
        '
        'CombType
        '
        Me.CombType.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.CombType.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombType.FormattingEnabled = True
        Me.CombType.Items.AddRange(New Object() {"بكالوريس", "دبلوم"})
        Me.CombType.Location = New System.Drawing.Point(19, 71)
        Me.CombType.Name = "CombType"
        Me.CombType.Size = New System.Drawing.Size(135, 21)
        Me.CombType.TabIndex = 106
        '
        'Button3
        '
        Me.Button3.Location = New System.Drawing.Point(470, 17)
        Me.Button3.Name = "Button3"
        Me.Button3.Size = New System.Drawing.Size(57, 23)
        Me.Button3.TabIndex = 108
        Me.Button3.Text = "..."
        Me.Button3.UseVisualStyleBackColor = True
        '
        'frmStudentProfileUpdate
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(789, 255)
        Me.Controls.Add(Me.GroupBox1)
        Me.Controls.Add(Me.Button1)
        Me.Controls.Add(Me.Button2)
        Me.Controls.Add(Me.GroupBox4)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MaximizeBox = False
        Me.Name = "frmStudentProfileUpdate"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "تعديل بيانات طالب"
        Me.GroupBox1.ResumeLayout(False)
        Me.GroupBox1.PerformLayout()
        CType(Me.ErrProvider, System.ComponentModel.ISupportInitialize).EndInit()
        Me.ResumeLayout(False)

    End Sub
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents CombBatch As System.Windows.Forms.ComboBox
    Friend WithEvents Label4 As System.Windows.Forms.Label
    Friend WithEvents txtStdName As System.Windows.Forms.TextBox
    Friend WithEvents txtStdPhone As System.Windows.Forms.TextBox
    Friend WithEvents Label11 As System.Windows.Forms.Label
    Friend WithEvents Label6 As System.Windows.Forms.Label
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents txtStdIndex As System.Windows.Forms.TextBox
    Friend WithEvents Label3 As System.Windows.Forms.Label
    Friend WithEvents Label2 As System.Windows.Forms.Label
    Friend WithEvents CombProgram As System.Windows.Forms.ComboBox
    Friend WithEvents txtStdAddress As System.Windows.Forms.TextBox
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents Button2 As System.Windows.Forms.Button
    Friend WithEvents GroupBox4 As System.Windows.Forms.GroupBox
    Friend WithEvents ErrProvider As System.Windows.Forms.ErrorProvider
    Friend WithEvents Label9 As System.Windows.Forms.Label
    Friend WithEvents txtWrittenValue As System.Windows.Forms.TextBox
    Friend WithEvents txtTutionFee As System.Windows.Forms.TextBox
    Friend WithEvents Label7 As System.Windows.Forms.Label
    Friend WithEvents combNationality As System.Windows.Forms.ComboBox
    Friend WithEvents Label8 As System.Windows.Forms.Label
    Friend WithEvents Label43 As System.Windows.Forms.Label
    Friend WithEvents CmbAdmiTyp As System.Windows.Forms.ComboBox
    Friend WithEvents Label13 As System.Windows.Forms.Label
    Friend WithEvents CombType As System.Windows.Forms.ComboBox
    Friend WithEvents Button3 As System.Windows.Forms.Button
End Class
