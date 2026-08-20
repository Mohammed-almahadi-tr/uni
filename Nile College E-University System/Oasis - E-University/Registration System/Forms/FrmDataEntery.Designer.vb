<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class FrmDataEntery
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
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(FrmDataEntery))
        Me.BtnClear = New System.Windows.Forms.Button()
        Me.BtnClose = New System.Windows.Forms.Button()
        Me.BtnSave = New System.Windows.Forms.Button()
        Me.ErrProvider = New System.Windows.Forms.ErrorProvider(Me.components)
        Me.GroupBox4 = New System.Windows.Forms.GroupBox()
        Me.CmbType = New System.Windows.Forms.ComboBox()
        Me.Label1 = New System.Windows.Forms.Label()
        Me.Label8 = New System.Windows.Forms.Label()
        Me.CmbAdmiTyp = New System.Windows.Forms.ComboBox()
        Me.TxtTHAr = New System.Windows.Forms.TextBox()
        Me.Label11 = New System.Windows.Forms.Label()
        Me.CombColeg = New System.Windows.Forms.ComboBox()
        Me.CombProgram = New System.Windows.Forms.ComboBox()
        Me.Label12 = New System.Windows.Forms.Label()
        Me.txtUniversityID = New System.Windows.Forms.TextBox()
        Me.Label6 = New System.Windows.Forms.Label()
        Me.Label5 = New System.Windows.Forms.Label()
        Me.Label2 = New System.Windows.Forms.Label()
        Me.Label3 = New System.Windows.Forms.Label()
        Me.Label4 = New System.Windows.Forms.Label()
        Me.TxtForAr = New System.Windows.Forms.TextBox()
        Me.TxtSAr = New System.Windows.Forms.TextBox()
        Me.TxtFAR = New System.Windows.Forms.TextBox()
        Me.TxtSchool = New System.Windows.Forms.TextBox()
        Me.Label7 = New System.Windows.Forms.Label()
        Me.TxtYears = New System.Windows.Forms.TextBox()
        Me.Label9 = New System.Windows.Forms.Label()
        CType(Me.ErrProvider, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.GroupBox4.SuspendLayout()
        Me.SuspendLayout()
        '
        'BtnClear
        '
        Me.BtnClear.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left), System.Windows.Forms.AnchorStyles)
        Me.BtnClear.Location = New System.Drawing.Point(103, 205)
        Me.BtnClear.Name = "BtnClear"
        Me.BtnClear.Size = New System.Drawing.Size(75, 28)
        Me.BtnClear.TabIndex = 1
        Me.BtnClear.Text = "مسح"
        Me.BtnClear.UseVisualStyleBackColor = True
        '
        'BtnClose
        '
        Me.BtnClose.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left), System.Windows.Forms.AnchorStyles)
        Me.BtnClose.Location = New System.Drawing.Point(22, 205)
        Me.BtnClose.Name = "BtnClose"
        Me.BtnClose.Size = New System.Drawing.Size(75, 28)
        Me.BtnClose.TabIndex = 2
        Me.BtnClose.Text = "إغلاق"
        Me.BtnClose.UseVisualStyleBackColor = True
        '
        'BtnSave
        '
        Me.BtnSave.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left), System.Windows.Forms.AnchorStyles)
        Me.BtnSave.Location = New System.Drawing.Point(184, 205)
        Me.BtnSave.Name = "BtnSave"
        Me.BtnSave.Size = New System.Drawing.Size(75, 28)
        Me.BtnSave.TabIndex = 0
        Me.BtnSave.Text = "حفظ"
        Me.BtnSave.UseVisualStyleBackColor = True
        '
        'ErrProvider
        '
        Me.ErrProvider.ContainerControl = Me
        '
        'GroupBox4
        '
        Me.GroupBox4.Anchor = CType(((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox4.Controls.Add(Me.CmbType)
        Me.GroupBox4.Controls.Add(Me.Label9)
        Me.GroupBox4.Controls.Add(Me.Label1)
        Me.GroupBox4.Controls.Add(Me.Label8)
        Me.GroupBox4.Controls.Add(Me.CmbAdmiTyp)
        Me.GroupBox4.Controls.Add(Me.TxtSchool)
        Me.GroupBox4.Controls.Add(Me.TxtTHAr)
        Me.GroupBox4.Controls.Add(Me.Label11)
        Me.GroupBox4.Controls.Add(Me.CombColeg)
        Me.GroupBox4.Controls.Add(Me.CombProgram)
        Me.GroupBox4.Controls.Add(Me.Label12)
        Me.GroupBox4.Controls.Add(Me.txtUniversityID)
        Me.GroupBox4.Controls.Add(Me.Label6)
        Me.GroupBox4.Controls.Add(Me.Label5)
        Me.GroupBox4.Controls.Add(Me.Label2)
        Me.GroupBox4.Controls.Add(Me.Label3)
        Me.GroupBox4.Controls.Add(Me.Label7)
        Me.GroupBox4.Controls.Add(Me.Label4)
        Me.GroupBox4.Controls.Add(Me.TxtForAr)
        Me.GroupBox4.Controls.Add(Me.TxtYears)
        Me.GroupBox4.Controls.Add(Me.TxtSAr)
        Me.GroupBox4.Controls.Add(Me.TxtFAR)
        Me.GroupBox4.Location = New System.Drawing.Point(12, 12)
        Me.GroupBox4.Name = "GroupBox4"
        Me.GroupBox4.Size = New System.Drawing.Size(792, 161)
        Me.GroupBox4.TabIndex = 110
        Me.GroupBox4.TabStop = False
        Me.GroupBox4.Text = "بيانات الطالب"
        '
        'CmbType
        '
        Me.CmbType.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.CmbType.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CmbType.FormattingEnabled = True
        Me.CmbType.Items.AddRange(New Object() {"بكالوريوس", "دبلوم"})
        Me.CmbType.Location = New System.Drawing.Point(8, 108)
        Me.CmbType.Name = "CmbType"
        Me.CmbType.Size = New System.Drawing.Size(163, 21)
        Me.CmbType.TabIndex = 8
        '
        'Label1
        '
        Me.Label1.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label1.AutoSize = True
        Me.Label1.Location = New System.Drawing.Point(177, 108)
        Me.Label1.Name = "Label1"
        Me.Label1.Size = New System.Drawing.Size(33, 13)
        Me.Label1.TabIndex = 160
        Me.Label1.Text = "النوع:"
        '
        'Label8
        '
        Me.Label8.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label8.AutoSize = True
        Me.Label8.Location = New System.Drawing.Point(419, 108)
        Me.Label8.Name = "Label8"
        Me.Label8.Size = New System.Drawing.Size(57, 13)
        Me.Label8.TabIndex = 155
        Me.Label8.Text = "نوع القبول:"
        '
        'CmbAdmiTyp
        '
        Me.CmbAdmiTyp.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.CmbAdmiTyp.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CmbAdmiTyp.FormattingEnabled = True
        Me.CmbAdmiTyp.Items.AddRange(New Object() {"قبول عام", "قبول خاص", "ابناء عاملين", "وافدين"})
        Me.CmbAdmiTyp.Location = New System.Drawing.Point(250, 104)
        Me.CmbAdmiTyp.Name = "CmbAdmiTyp"
        Me.CmbAdmiTyp.Size = New System.Drawing.Size(163, 21)
        Me.CmbAdmiTyp.TabIndex = 7
        '
        'TxtTHAr
        '
        Me.TxtTHAr.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.TxtTHAr.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.TxtTHAr.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.TxtTHAr.ForeColor = System.Drawing.Color.Black
        Me.TxtTHAr.Location = New System.Drawing.Point(540, 70)
        Me.TxtTHAr.Name = "TxtTHAr"
        Me.TxtTHAr.Size = New System.Drawing.Size(163, 22)
        Me.TxtTHAr.TabIndex = 4
        Me.TxtTHAr.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label11
        '
        Me.Label11.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label11.AutoSize = True
        Me.Label11.Location = New System.Drawing.Point(709, 73)
        Me.Label11.Name = "Label11"
        Me.Label11.Size = New System.Drawing.Size(69, 13)
        Me.Label11.TabIndex = 156
        Me.Label11.Text = "الاسم الثالث:"
        '
        'CombColeg
        '
        Me.CombColeg.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.CombColeg.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombColeg.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.CombColeg.FormattingEnabled = True
        Me.CombColeg.Items.AddRange(New Object() {"علوم التمريض", "العمارة", "الهندسة", "الدراسـات التجـارية ", "علوم الحاسوب ونظم المعلومات", "علوم الحاسوب وتقانة المعلومات", "القانون"})
        Me.CombColeg.Location = New System.Drawing.Point(8, 70)
        Me.CombColeg.Name = "CombColeg"
        Me.CombColeg.Size = New System.Drawing.Size(163, 22)
        Me.CombColeg.TabIndex = 5
        '
        'CombProgram
        '
        Me.CombProgram.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.CombProgram.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombProgram.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.CombProgram.FormattingEnabled = True
        Me.CombProgram.Items.AddRange(New Object() {"علوم التمريض", "الدراسات التجارية", "تقانة المعلومات", "نظم المعلومات", "التكنولوجى فى الهندسة المدنية", "العمارة", "التكنولوجى فى هندسة الكهرباء - قدرة", "التكنولوجى فى هندسة الكهرباء - تحكم", "التكنولوجى فى هندسة الكهرباء - اتصالات", "التكنولوجى فى هندسة الكهرباء", "التكنولوجى فى هندسة الكهرباء - الكترونيات وحاسوب", "القانون"})
        Me.CombProgram.Location = New System.Drawing.Point(482, 104)
        Me.CombProgram.Name = "CombProgram"
        Me.CombProgram.Size = New System.Drawing.Size(252, 22)
        Me.CombProgram.TabIndex = 6
        '
        'Label12
        '
        Me.Label12.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label12.AutoSize = True
        Me.Label12.Location = New System.Drawing.Point(419, 74)
        Me.Label12.Name = "Label12"
        Me.Label12.Size = New System.Drawing.Size(66, 13)
        Me.Label12.TabIndex = 154
        Me.Label12.Text = "الاسم الرابع:"
        '
        'txtUniversityID
        '
        Me.txtUniversityID.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtUniversityID.BackColor = System.Drawing.Color.White
        Me.txtUniversityID.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtUniversityID.Font = New System.Drawing.Font("Tahoma", 9.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtUniversityID.ForeColor = System.Drawing.Color.Black
        Me.txtUniversityID.Location = New System.Drawing.Point(540, 31)
        Me.txtUniversityID.Name = "txtUniversityID"
        Me.txtUniversityID.RightToLeft = System.Windows.Forms.RightToLeft.No
        Me.txtUniversityID.Size = New System.Drawing.Size(163, 23)
        Me.txtUniversityID.TabIndex = 0
        Me.txtUniversityID.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label6
        '
        Me.Label6.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label6.AutoSize = True
        Me.Label6.Location = New System.Drawing.Point(177, 35)
        Me.Label6.Name = "Label6"
        Me.Label6.Size = New System.Drawing.Size(70, 13)
        Me.Label6.TabIndex = 152
        Me.Label6.Text = "الاسم الثاني:"
        '
        'Label5
        '
        Me.Label5.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label5.AutoSize = True
        Me.Label5.Location = New System.Drawing.Point(709, 35)
        Me.Label5.Name = "Label5"
        Me.Label5.Size = New System.Drawing.Size(77, 13)
        Me.Label5.TabIndex = 162
        Me.Label5.Text = "الرقم الجامعي:"
        '
        'Label2
        '
        Me.Label2.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label2.AutoSize = True
        Me.Label2.Location = New System.Drawing.Point(419, 35)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(65, 13)
        Me.Label2.TabIndex = 153
        Me.Label2.Text = "الاسم الاول:"
        '
        'Label3
        '
        Me.Label3.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label3.AutoSize = True
        Me.Label3.Location = New System.Drawing.Point(177, 73)
        Me.Label3.Name = "Label3"
        Me.Label3.Size = New System.Drawing.Size(37, 13)
        Me.Label3.TabIndex = 151
        Me.Label3.Text = "الكلية:"
        '
        'Label4
        '
        Me.Label4.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label4.AutoSize = True
        Me.Label4.Location = New System.Drawing.Point(740, 108)
        Me.Label4.Name = "Label4"
        Me.Label4.Size = New System.Drawing.Size(46, 13)
        Me.Label4.TabIndex = 157
        Me.Label4.Text = "البرنامج:"
        '
        'TxtForAr
        '
        Me.TxtForAr.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.TxtForAr.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.TxtForAr.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.TxtForAr.ForeColor = System.Drawing.Color.Black
        Me.TxtForAr.Location = New System.Drawing.Point(250, 71)
        Me.TxtForAr.Name = "TxtForAr"
        Me.TxtForAr.Size = New System.Drawing.Size(163, 22)
        Me.TxtForAr.TabIndex = 3
        Me.TxtForAr.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'TxtSAr
        '
        Me.TxtSAr.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.TxtSAr.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.TxtSAr.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.TxtSAr.ForeColor = System.Drawing.Color.Black
        Me.TxtSAr.Location = New System.Drawing.Point(8, 32)
        Me.TxtSAr.Name = "TxtSAr"
        Me.TxtSAr.Size = New System.Drawing.Size(163, 22)
        Me.TxtSAr.TabIndex = 2
        Me.TxtSAr.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'TxtFAR
        '
        Me.TxtFAR.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.TxtFAR.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.TxtFAR.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.TxtFAR.ForeColor = System.Drawing.Color.Black
        Me.TxtFAR.Location = New System.Drawing.Point(250, 32)
        Me.TxtFAR.Name = "TxtFAR"
        Me.TxtFAR.Size = New System.Drawing.Size(163, 22)
        Me.TxtFAR.TabIndex = 1
        Me.TxtFAR.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'TxtSchool
        '
        Me.TxtSchool.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.TxtSchool.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.TxtSchool.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.TxtSchool.ForeColor = System.Drawing.Color.Black
        Me.TxtSchool.Location = New System.Drawing.Point(250, 132)
        Me.TxtSchool.Name = "TxtSchool"
        Me.TxtSchool.Size = New System.Drawing.Size(484, 22)
        Me.TxtSchool.TabIndex = 4
        Me.TxtSchool.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label7
        '
        Me.Label7.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label7.AutoSize = True
        Me.Label7.Location = New System.Drawing.Point(740, 135)
        Me.Label7.Name = "Label7"
        Me.Label7.Size = New System.Drawing.Size(51, 13)
        Me.Label7.TabIndex = 157
        Me.Label7.Text = "المدرسة:"
        '
        'TxtYears
        '
        Me.TxtYears.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.TxtYears.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.TxtYears.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.TxtYears.ForeColor = System.Drawing.Color.Black
        Me.TxtYears.Location = New System.Drawing.Point(6, 135)
        Me.TxtYears.Name = "TxtYears"
        Me.TxtYears.Size = New System.Drawing.Size(163, 22)
        Me.TxtYears.TabIndex = 2
        Me.TxtYears.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label9
        '
        Me.Label9.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label9.AutoSize = True
        Me.Label9.Location = New System.Drawing.Point(175, 135)
        Me.Label9.Name = "Label9"
        Me.Label9.Size = New System.Drawing.Size(39, 13)
        Me.Label9.TabIndex = 160
        Me.Label9.Text = "السنة:"
        '
        'FrmDataEntery
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(810, 341)
        Me.Controls.Add(Me.BtnClear)
        Me.Controls.Add(Me.BtnClose)
        Me.Controls.Add(Me.BtnSave)
        Me.Controls.Add(Me.GroupBox4)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MaximizeBox = False
        Me.Name = "FrmDataEntery"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Text = "ادخال بيانات الطالب"
        CType(Me.ErrProvider, System.ComponentModel.ISupportInitialize).EndInit()
        Me.GroupBox4.ResumeLayout(False)
        Me.GroupBox4.PerformLayout()
        Me.ResumeLayout(False)

    End Sub
    Friend WithEvents BtnClear As System.Windows.Forms.Button
    Friend WithEvents BtnClose As System.Windows.Forms.Button
    Friend WithEvents BtnSave As System.Windows.Forms.Button
    Friend WithEvents ErrProvider As System.Windows.Forms.ErrorProvider
    Friend WithEvents GroupBox4 As System.Windows.Forms.GroupBox
    Friend WithEvents CmbType As System.Windows.Forms.ComboBox
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents Label8 As System.Windows.Forms.Label
    Friend WithEvents CmbAdmiTyp As System.Windows.Forms.ComboBox
    Friend WithEvents CombColeg As System.Windows.Forms.ComboBox
    Friend WithEvents CombProgram As System.Windows.Forms.ComboBox
    Friend WithEvents Label12 As System.Windows.Forms.Label
    Friend WithEvents Label11 As System.Windows.Forms.Label
    Friend WithEvents txtUniversityID As System.Windows.Forms.TextBox
    Friend WithEvents Label6 As System.Windows.Forms.Label
    Friend WithEvents Label5 As System.Windows.Forms.Label
    Friend WithEvents Label2 As System.Windows.Forms.Label
    Friend WithEvents Label3 As System.Windows.Forms.Label
    Friend WithEvents Label4 As System.Windows.Forms.Label
    Friend WithEvents TxtForAr As System.Windows.Forms.TextBox
    Friend WithEvents TxtTHAr As System.Windows.Forms.TextBox
    Friend WithEvents TxtSAr As System.Windows.Forms.TextBox
    Friend WithEvents TxtFAR As System.Windows.Forms.TextBox
    Friend WithEvents Label9 As System.Windows.Forms.Label
    Friend WithEvents TxtSchool As System.Windows.Forms.TextBox
    Friend WithEvents Label7 As System.Windows.Forms.Label
    Friend WithEvents TxtYears As System.Windows.Forms.TextBox
End Class
