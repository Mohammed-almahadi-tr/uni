<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frmStudentProfiles
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
        Dim DataGridViewCellStyle1 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim DataGridViewCellStyle2 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim DataGridViewCellStyle3 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmStudentProfiles))
        Me.GroupBox1 = New System.Windows.Forms.GroupBox()
        Me.TxtProgram = New System.Windows.Forms.TextBox()
        Me.CombColleg = New System.Windows.Forms.ComboBox()
        Me.TxtYear = New System.Windows.Forms.TextBox()
        Me.Label14 = New System.Windows.Forms.Label()
        Me.Label43 = New System.Windows.Forms.Label()
        Me.CmbAdmiTyp = New System.Windows.Forms.ComboBox()
        Me.Label13 = New System.Windows.Forms.Label()
        Me.CombType = New System.Windows.Forms.ComboBox()
        Me.Button4 = New System.Windows.Forms.Button()
        Me.txtReasonofIndecent = New System.Windows.Forms.TextBox()
        Me.Label17 = New System.Windows.Forms.Label()
        Me.ComboBox1 = New System.Windows.Forms.ComboBox()
        Me.Label10 = New System.Windows.Forms.Label()
        Me.combNationality = New System.Windows.Forms.ComboBox()
        Me.Label8 = New System.Windows.Forms.Label()
        Me.Label12 = New System.Windows.Forms.Label()
        Me.Label9 = New System.Windows.Forms.Label()
        Me.txtWrittenValue = New System.Windows.Forms.TextBox()
        Me.TxtRe = New System.Windows.Forms.TextBox()
        Me.txtTutionFee = New System.Windows.Forms.TextBox()
        Me.Label15 = New System.Windows.Forms.Label()
        Me.Label7 = New System.Windows.Forms.Label()
        Me.Label4 = New System.Windows.Forms.Label()
        Me.txtStdIndex = New System.Windows.Forms.TextBox()
        Me.Label2 = New System.Windows.Forms.Label()
        Me.txtStdName = New System.Windows.Forms.TextBox()
        Me.Label3 = New System.Windows.Forms.Label()
        Me.Label1 = New System.Windows.Forms.Label()
        Me.txtStdAdderess = New System.Windows.Forms.TextBox()
        Me.Label6 = New System.Windows.Forms.Label()
        Me.txtStdParJop = New System.Windows.Forms.TextBox()
        Me.Label11 = New System.Windows.Forms.Label()
        Me.Button3 = New System.Windows.Forms.Button()
        Me.Button2 = New System.Windows.Forms.Button()
        Me.GroupBox2 = New System.Windows.Forms.GroupBox()
        Me.Button1 = New System.Windows.Forms.Button()
        Me.txtStudNameSearch = New System.Windows.Forms.TextBox()
        Me.Label5 = New System.Windows.Forms.Label()
        Me.GridStudProfiles = New System.Windows.Forms.DataGridView()
        Me.Column3 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column2 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column4 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column5 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column9 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column10 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column6 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column7 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column8 = New System.Windows.Forms.DataGridViewButtonColumn()
        Me.Column11 = New System.Windows.Forms.DataGridViewButtonColumn()
        Me.ErrorProvider1 = New System.Windows.Forms.ErrorProvider(Me.components)
        Me.DateTimePicker1 = New System.Windows.Forms.DateTimePicker()
        Me.GroupBox1.SuspendLayout()
        Me.GroupBox2.SuspendLayout()
        CType(Me.GridStudProfiles, System.ComponentModel.ISupportInitialize).BeginInit()
        CType(Me.ErrorProvider1, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.SuspendLayout()
        '
        'GroupBox1
        '
        Me.GroupBox1.Anchor = CType(((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox1.Controls.Add(Me.TxtProgram)
        Me.GroupBox1.Controls.Add(Me.CombColleg)
        Me.GroupBox1.Controls.Add(Me.TxtYear)
        Me.GroupBox1.Controls.Add(Me.Label14)
        Me.GroupBox1.Controls.Add(Me.Label43)
        Me.GroupBox1.Controls.Add(Me.CmbAdmiTyp)
        Me.GroupBox1.Controls.Add(Me.Label13)
        Me.GroupBox1.Controls.Add(Me.CombType)
        Me.GroupBox1.Controls.Add(Me.Button4)
        Me.GroupBox1.Controls.Add(Me.txtReasonofIndecent)
        Me.GroupBox1.Controls.Add(Me.Label17)
        Me.GroupBox1.Controls.Add(Me.ComboBox1)
        Me.GroupBox1.Controls.Add(Me.Label10)
        Me.GroupBox1.Controls.Add(Me.combNationality)
        Me.GroupBox1.Controls.Add(Me.Label8)
        Me.GroupBox1.Controls.Add(Me.Label12)
        Me.GroupBox1.Controls.Add(Me.Label9)
        Me.GroupBox1.Controls.Add(Me.txtWrittenValue)
        Me.GroupBox1.Controls.Add(Me.TxtRe)
        Me.GroupBox1.Controls.Add(Me.txtTutionFee)
        Me.GroupBox1.Controls.Add(Me.Label15)
        Me.GroupBox1.Controls.Add(Me.Label7)
        Me.GroupBox1.Controls.Add(Me.Label4)
        Me.GroupBox1.Controls.Add(Me.txtStdIndex)
        Me.GroupBox1.Controls.Add(Me.Label2)
        Me.GroupBox1.Controls.Add(Me.txtStdName)
        Me.GroupBox1.Controls.Add(Me.Label3)
        Me.GroupBox1.Controls.Add(Me.Label1)
        Me.GroupBox1.Controls.Add(Me.txtStdAdderess)
        Me.GroupBox1.Controls.Add(Me.Label6)
        Me.GroupBox1.Controls.Add(Me.txtStdParJop)
        Me.GroupBox1.Controls.Add(Me.Label11)
        Me.GroupBox1.Location = New System.Drawing.Point(11, 3)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(1224, 180)
        Me.GroupBox1.TabIndex = 0
        Me.GroupBox1.TabStop = False
        '
        'TxtProgram
        '
        Me.TxtProgram.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.TxtProgram.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.TxtProgram.Location = New System.Drawing.Point(705, 15)
        Me.TxtProgram.Name = "TxtProgram"
        Me.TxtProgram.ReadOnly = True
        Me.TxtProgram.Size = New System.Drawing.Size(156, 20)
        Me.TxtProgram.TabIndex = 105
        '
        'CombColleg
        '
        Me.CombColleg.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.CombColleg.Enabled = False
        Me.CombColleg.FormattingEnabled = True
        Me.CombColleg.Location = New System.Drawing.Point(35, 12)
        Me.CombColleg.Name = "CombColleg"
        Me.CombColleg.Size = New System.Drawing.Size(237, 21)
        Me.CombColleg.TabIndex = 43
        '
        'TxtYear
        '
        Me.TxtYear.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.TxtYear.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.TxtYear.Enabled = False
        Me.TxtYear.Location = New System.Drawing.Point(705, 44)
        Me.TxtYear.Name = "TxtYear"
        Me.TxtYear.Size = New System.Drawing.Size(157, 20)
        Me.TxtYear.TabIndex = 104
        '
        'Label14
        '
        Me.Label14.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label14.AutoSize = True
        Me.Label14.Location = New System.Drawing.Point(278, 16)
        Me.Label14.Name = "Label14"
        Me.Label14.Size = New System.Drawing.Size(37, 13)
        Me.Label14.TabIndex = 103
        Me.Label14.Text = "الكلية:"
        '
        'Label43
        '
        Me.Label43.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label43.AutoSize = True
        Me.Label43.Location = New System.Drawing.Point(601, 83)
        Me.Label43.Name = "Label43"
        Me.Label43.Size = New System.Drawing.Size(33, 13)
        Me.Label43.TabIndex = 103
        Me.Label43.Text = "النوع:"
        '
        'CmbAdmiTyp
        '
        Me.CmbAdmiTyp.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.CmbAdmiTyp.FormattingEnabled = True
        Me.CmbAdmiTyp.Items.AddRange(New Object() {"عام ", "خاص"})
        Me.CmbAdmiTyp.Location = New System.Drawing.Point(705, 79)
        Me.CmbAdmiTyp.Name = "CmbAdmiTyp"
        Me.CmbAdmiTyp.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.CmbAdmiTyp.Size = New System.Drawing.Size(156, 21)
        Me.CmbAdmiTyp.TabIndex = 77
        '
        'Label13
        '
        Me.Label13.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label13.AutoSize = True
        Me.Label13.Location = New System.Drawing.Point(866, 82)
        Me.Label13.Name = "Label13"
        Me.Label13.Size = New System.Drawing.Size(53, 13)
        Me.Label13.TabIndex = 78
        Me.Label13.Text = "نوع القبول"
        '
        'CombType
        '
        Me.CombType.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.CombType.FormattingEnabled = True
        Me.CombType.Location = New System.Drawing.Point(332, 80)
        Me.CombType.Name = "CombType"
        Me.CombType.Size = New System.Drawing.Size(263, 21)
        Me.CombType.TabIndex = 101
        '
        'Button4
        '
        Me.Button4.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Button4.Location = New System.Drawing.Point(934, 14)
        Me.Button4.Name = "Button4"
        Me.Button4.Size = New System.Drawing.Size(64, 23)
        Me.Button4.TabIndex = 53
        Me.Button4.Text = "..."
        Me.Button4.UseVisualStyleBackColor = True
        '
        'txtReasonofIndecent
        '
        Me.txtReasonofIndecent.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtReasonofIndecent.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtReasonofIndecent.Location = New System.Drawing.Point(332, 146)
        Me.txtReasonofIndecent.Name = "txtReasonofIndecent"
        Me.txtReasonofIndecent.Size = New System.Drawing.Size(530, 20)
        Me.txtReasonofIndecent.TabIndex = 52
        '
        'Label17
        '
        Me.Label17.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label17.AutoSize = True
        Me.Label17.Location = New System.Drawing.Point(868, 150)
        Me.Label17.Name = "Label17"
        Me.Label17.Size = New System.Drawing.Size(134, 13)
        Me.Label17.TabIndex = 51
        Me.Label17.Text = "الاسباب""اذا كان  غير مقبول"""
        '
        'ComboBox1
        '
        Me.ComboBox1.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.ComboBox1.FormattingEnabled = True
        Me.ComboBox1.Items.AddRange(New Object() {"يقبل", "لايقبل"})
        Me.ComboBox1.Location = New System.Drawing.Point(1008, 145)
        Me.ComboBox1.Name = "ComboBox1"
        Me.ComboBox1.Size = New System.Drawing.Size(117, 21)
        Me.ComboBox1.TabIndex = 50
        '
        'Label10
        '
        Me.Label10.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label10.AutoSize = True
        Me.Label10.Location = New System.Drawing.Point(935, 117)
        Me.Label10.Name = "Label10"
        Me.Label10.Size = New System.Drawing.Size(27, 13)
        Me.Label10.TabIndex = 49
        Me.Label10.Text = "SDG"
        '
        'combNationality
        '
        Me.combNationality.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.combNationality.FormattingEnabled = True
        Me.combNationality.Location = New System.Drawing.Point(935, 79)
        Me.combNationality.Name = "combNationality"
        Me.combNationality.Size = New System.Drawing.Size(188, 21)
        Me.combNationality.TabIndex = 48
        '
        'Label8
        '
        Me.Label8.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label8.AutoSize = True
        Me.Label8.Location = New System.Drawing.Point(1132, 83)
        Me.Label8.Name = "Label8"
        Me.Label8.Size = New System.Drawing.Size(53, 13)
        Me.Label8.TabIndex = 47
        Me.Label8.Text = "الجنسية :"
        '
        'Label12
        '
        Me.Label12.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label12.AutoSize = True
        Me.Label12.Location = New System.Drawing.Point(1132, 148)
        Me.Label12.Name = "Label12"
        Me.Label12.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label12.Size = New System.Drawing.Size(76, 13)
        Me.Label12.TabIndex = 46
        Me.Label12.Text = "نتيجة المعاينةً :"
        '
        'Label9
        '
        Me.Label9.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label9.AutoSize = True
        Me.Label9.Location = New System.Drawing.Point(868, 117)
        Me.Label9.Name = "Label9"
        Me.Label9.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label9.Size = New System.Drawing.Size(39, 13)
        Me.Label9.TabIndex = 46
        Me.Label9.Text = "كتابتة :"
        '
        'txtWrittenValue
        '
        Me.txtWrittenValue.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtWrittenValue.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtWrittenValue.Location = New System.Drawing.Point(332, 115)
        Me.txtWrittenValue.Multiline = True
        Me.txtWrittenValue.Name = "txtWrittenValue"
        Me.txtWrittenValue.ReadOnly = True
        Me.txtWrittenValue.Size = New System.Drawing.Size(529, 20)
        Me.txtWrittenValue.TabIndex = 45
        '
        'TxtRe
        '
        Me.TxtRe.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.TxtRe.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.TxtRe.Location = New System.Drawing.Point(118, 115)
        Me.TxtRe.Name = "TxtRe"
        Me.TxtRe.Size = New System.Drawing.Size(117, 20)
        Me.TxtRe.TabIndex = 42
        Me.TxtRe.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'txtTutionFee
        '
        Me.txtTutionFee.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtTutionFee.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtTutionFee.Location = New System.Drawing.Point(968, 113)
        Me.txtTutionFee.Name = "txtTutionFee"
        Me.txtTutionFee.Size = New System.Drawing.Size(157, 20)
        Me.txtTutionFee.TabIndex = 42
        '
        'Label15
        '
        Me.Label15.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label15.AutoSize = True
        Me.Label15.Location = New System.Drawing.Point(235, 120)
        Me.Label15.Name = "Label15"
        Me.Label15.Size = New System.Drawing.Size(85, 13)
        Me.Label15.TabIndex = 43
        Me.Label15.Text = "رسوم التسجيل :"
        '
        'Label7
        '
        Me.Label7.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label7.AutoSize = True
        Me.Label7.Location = New System.Drawing.Point(1132, 117)
        Me.Label7.Name = "Label7"
        Me.Label7.Size = New System.Drawing.Size(91, 13)
        Me.Label7.TabIndex = 43
        Me.Label7.Text = "الرسوم الدراسية :"
        '
        'Label4
        '
        Me.Label4.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label4.AutoSize = True
        Me.Label4.Location = New System.Drawing.Point(867, 48)
        Me.Label4.Name = "Label4"
        Me.Label4.Size = New System.Drawing.Size(40, 13)
        Me.Label4.TabIndex = 40
        Me.Label4.Text = "الدفعة:"
        '
        'txtStdIndex
        '
        Me.txtStdIndex.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtStdIndex.BackColor = System.Drawing.Color.Black
        Me.txtStdIndex.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtStdIndex.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtStdIndex.ForeColor = System.Drawing.Color.YellowGreen
        Me.txtStdIndex.Location = New System.Drawing.Point(1006, 15)
        Me.txtStdIndex.Name = "txtStdIndex"
        Me.txtStdIndex.Size = New System.Drawing.Size(117, 22)
        Me.txtStdIndex.TabIndex = 0
        Me.txtStdIndex.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label2
        '
        Me.Label2.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label2.AutoSize = True
        Me.Label2.Location = New System.Drawing.Point(1130, 19)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(80, 13)
        Me.Label2.TabIndex = 39
        Me.Label2.Text = "الرقم الجامعي :"
        '
        'txtStdName
        '
        Me.txtStdName.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtStdName.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtStdName.Enabled = False
        Me.txtStdName.Location = New System.Drawing.Point(934, 44)
        Me.txtStdName.Name = "txtStdName"
        Me.txtStdName.Size = New System.Drawing.Size(189, 20)
        Me.txtStdName.TabIndex = 1
        '
        'Label3
        '
        Me.Label3.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label3.AutoSize = True
        Me.Label3.Location = New System.Drawing.Point(1129, 46)
        Me.Label3.Name = "Label3"
        Me.Label3.Size = New System.Drawing.Size(69, 13)
        Me.Label3.TabIndex = 5
        Me.Label3.Text = "إسم الطالب :"
        '
        'Label1
        '
        Me.Label1.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label1.AutoSize = True
        Me.Label1.Location = New System.Drawing.Point(867, 19)
        Me.Label1.Name = "Label1"
        Me.Label1.Size = New System.Drawing.Size(49, 13)
        Me.Label1.TabIndex = 0
        Me.Label1.Text = "البرنامج :"
        '
        'txtStdAdderess
        '
        Me.txtStdAdderess.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtStdAdderess.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtStdAdderess.Enabled = False
        Me.txtStdAdderess.Location = New System.Drawing.Point(332, 44)
        Me.txtStdAdderess.Multiline = True
        Me.txtStdAdderess.Name = "txtStdAdderess"
        Me.txtStdAdderess.Size = New System.Drawing.Size(263, 21)
        Me.txtStdAdderess.TabIndex = 7
        '
        'Label6
        '
        Me.Label6.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label6.AutoSize = True
        Me.Label6.Location = New System.Drawing.Point(601, 48)
        Me.Label6.Name = "Label6"
        Me.Label6.Size = New System.Drawing.Size(45, 13)
        Me.Label6.TabIndex = 12
        Me.Label6.Text = "العنوان :"
        '
        'txtStdParJop
        '
        Me.txtStdParJop.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtStdParJop.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtStdParJop.Enabled = False
        Me.txtStdParJop.Location = New System.Drawing.Point(332, 12)
        Me.txtStdParJop.Name = "txtStdParJop"
        Me.txtStdParJop.Size = New System.Drawing.Size(263, 20)
        Me.txtStdParJop.TabIndex = 5
        '
        'Label11
        '
        Me.Label11.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label11.AutoSize = True
        Me.Label11.Location = New System.Drawing.Point(601, 17)
        Me.Label11.Name = "Label11"
        Me.Label11.Size = New System.Drawing.Size(85, 13)
        Me.Label11.TabIndex = 19
        Me.Label11.Text = "وظيفة ولي الامر:"
        '
        'Button3
        '
        Me.Button3.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Button3.Location = New System.Drawing.Point(402, 189)
        Me.Button3.Name = "Button3"
        Me.Button3.Size = New System.Drawing.Size(75, 23)
        Me.Button3.TabIndex = 2
        Me.Button3.Text = "مسح"
        Me.Button3.UseVisualStyleBackColor = True
        '
        'Button2
        '
        Me.Button2.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Button2.Location = New System.Drawing.Point(510, 189)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(75, 23)
        Me.Button2.TabIndex = 1
        Me.Button2.Text = "حفظ"
        Me.Button2.UseVisualStyleBackColor = True
        '
        'GroupBox2
        '
        Me.GroupBox2.Anchor = CType((((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Bottom) _
            Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox2.Controls.Add(Me.Button1)
        Me.GroupBox2.Controls.Add(Me.txtStudNameSearch)
        Me.GroupBox2.Controls.Add(Me.Label5)
        Me.GroupBox2.Controls.Add(Me.GridStudProfiles)
        Me.GroupBox2.Location = New System.Drawing.Point(11, 218)
        Me.GroupBox2.Name = "GroupBox2"
        Me.GroupBox2.Size = New System.Drawing.Size(1224, 299)
        Me.GroupBox2.TabIndex = 3
        Me.GroupBox2.TabStop = False
        Me.GroupBox2.Text = "ملفات الطلاب"
        '
        'Button1
        '
        Me.Button1.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Button1.Location = New System.Drawing.Point(854, 19)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 23)
        Me.Button1.TabIndex = 4
        Me.Button1.Text = "بحث"
        Me.Button1.UseVisualStyleBackColor = True
        '
        'txtStudNameSearch
        '
        Me.txtStudNameSearch.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtStudNameSearch.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtStudNameSearch.Location = New System.Drawing.Point(935, 20)
        Me.txtStudNameSearch.Name = "txtStudNameSearch"
        Me.txtStudNameSearch.Size = New System.Drawing.Size(189, 20)
        Me.txtStudNameSearch.TabIndex = 42
        '
        'Label5
        '
        Me.Label5.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label5.AutoSize = True
        Me.Label5.Location = New System.Drawing.Point(1130, 24)
        Me.Label5.Name = "Label5"
        Me.Label5.Size = New System.Drawing.Size(76, 13)
        Me.Label5.TabIndex = 43
        Me.Label5.Text = "الإسم الطالب :"
        '
        'GridStudProfiles
        '
        Me.GridStudProfiles.AllowUserToAddRows = False
        Me.GridStudProfiles.AllowUserToDeleteRows = False
        Me.GridStudProfiles.Anchor = CType((((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Bottom) _
            Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        DataGridViewCellStyle1.Alignment = System.Windows.Forms.DataGridViewContentAlignment.MiddleLeft
        DataGridViewCellStyle1.BackColor = System.Drawing.SystemColors.Control
        DataGridViewCellStyle1.Font = New System.Drawing.Font("Tahoma", 8.0!)
        DataGridViewCellStyle1.ForeColor = System.Drawing.SystemColors.WindowText
        DataGridViewCellStyle1.SelectionBackColor = System.Drawing.SystemColors.Highlight
        DataGridViewCellStyle1.SelectionForeColor = System.Drawing.SystemColors.HighlightText
        DataGridViewCellStyle1.WrapMode = System.Windows.Forms.DataGridViewTriState.[True]
        Me.GridStudProfiles.ColumnHeadersDefaultCellStyle = DataGridViewCellStyle1
        Me.GridStudProfiles.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.AutoSize
        Me.GridStudProfiles.Columns.AddRange(New System.Windows.Forms.DataGridViewColumn() {Me.Column3, Me.Column2, Me.Column4, Me.Column5, Me.Column9, Me.Column10, Me.Column6, Me.Column7, Me.Column8, Me.Column11})
        DataGridViewCellStyle2.Alignment = System.Windows.Forms.DataGridViewContentAlignment.MiddleLeft
        DataGridViewCellStyle2.BackColor = System.Drawing.SystemColors.Window
        DataGridViewCellStyle2.Font = New System.Drawing.Font("Tahoma", 8.0!)
        DataGridViewCellStyle2.ForeColor = System.Drawing.SystemColors.ControlText
        DataGridViewCellStyle2.SelectionBackColor = System.Drawing.SystemColors.Highlight
        DataGridViewCellStyle2.SelectionForeColor = System.Drawing.SystemColors.HighlightText
        DataGridViewCellStyle2.WrapMode = System.Windows.Forms.DataGridViewTriState.[False]
        Me.GridStudProfiles.DefaultCellStyle = DataGridViewCellStyle2
        Me.GridStudProfiles.Location = New System.Drawing.Point(10, 48)
        Me.GridStudProfiles.Name = "GridStudProfiles"
        DataGridViewCellStyle3.Alignment = System.Windows.Forms.DataGridViewContentAlignment.MiddleLeft
        DataGridViewCellStyle3.BackColor = System.Drawing.SystemColors.Control
        DataGridViewCellStyle3.Font = New System.Drawing.Font("Tahoma", 8.0!)
        DataGridViewCellStyle3.ForeColor = System.Drawing.SystemColors.WindowText
        DataGridViewCellStyle3.SelectionBackColor = System.Drawing.SystemColors.Highlight
        DataGridViewCellStyle3.SelectionForeColor = System.Drawing.SystemColors.HighlightText
        DataGridViewCellStyle3.WrapMode = System.Windows.Forms.DataGridViewTriState.[True]
        Me.GridStudProfiles.RowHeadersDefaultCellStyle = DataGridViewCellStyle3
        Me.GridStudProfiles.Size = New System.Drawing.Size(1205, 219)
        Me.GridStudProfiles.TabIndex = 0
        '
        'Column3
        '
        Me.Column3.HeaderText = "الرقم الجامعي"
        Me.Column3.Name = "Column3"
        Me.Column3.ReadOnly = True
        '
        'Column2
        '
        Me.Column2.HeaderText = "الإسم"
        Me.Column2.Name = "Column2"
        Me.Column2.ReadOnly = True
        Me.Column2.Width = 200
        '
        'Column4
        '
        Me.Column4.HeaderText = "البرنامج"
        Me.Column4.Name = "Column4"
        Me.Column4.ReadOnly = True
        Me.Column4.Width = 200
        '
        'Column5
        '
        Me.Column5.HeaderText = "الدفعة"
        Me.Column5.Name = "Column5"
        Me.Column5.ReadOnly = True
        '
        'Column9
        '
        Me.Column9.HeaderText = "مواعيد المعاينة"
        Me.Column9.Name = "Column9"
        Me.Column9.ReadOnly = True
        Me.Column9.Width = 200
        '
        'Column10
        '
        Me.Column10.HeaderText = "وظيفة ولي الامر"
        Me.Column10.Name = "Column10"
        '
        'Column6
        '
        Me.Column6.HeaderText = "هاتف ولي الامر"
        Me.Column6.Name = "Column6"
        '
        'Column7
        '
        Me.Column7.HeaderText = "هاتف الطالب"
        Me.Column7.Name = "Column7"
        Me.Column7.Width = 150
        '
        'Column8
        '
        Me.Column8.HeaderText = "تعديل"
        Me.Column8.Name = "Column8"
        '
        'Column11
        '
        Me.Column11.HeaderText = "تعديل الملف"
        Me.Column11.Name = "Column11"
        Me.Column11.Resizable = System.Windows.Forms.DataGridViewTriState.[True]
        Me.Column11.SortMode = System.Windows.Forms.DataGridViewColumnSortMode.Automatic
        Me.Column11.Visible = False
        '
        'ErrorProvider1
        '
        Me.ErrorProvider1.ContainerControl = Me
        '
        'DateTimePicker1
        '
        Me.DateTimePicker1.CustomFormat = "dd/MM/yyy"
        Me.DateTimePicker1.Format = System.Windows.Forms.DateTimePickerFormat.Custom
        Me.DateTimePicker1.Location = New System.Drawing.Point(46, 188)
        Me.DateTimePicker1.Name = "DateTimePicker1"
        Me.DateTimePicker1.RightToLeftLayout = True
        Me.DateTimePicker1.Size = New System.Drawing.Size(200, 20)
        Me.DateTimePicker1.TabIndex = 42
        Me.DateTimePicker1.Visible = False
        '
        'frmStudentProfiles
        '
        Me.AcceptButton = Me.Button4
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.AutoSize = True
        Me.ClientSize = New System.Drawing.Size(1246, 525)
        Me.Controls.Add(Me.DateTimePicker1)
        Me.Controls.Add(Me.GroupBox2)
        Me.Controls.Add(Me.Button3)
        Me.Controls.Add(Me.Button2)
        Me.Controls.Add(Me.GroupBox1)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.Name = "frmStudentProfiles"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Text = "إنشاء ملف طالب / طالبة"
        Me.WindowState = System.Windows.Forms.FormWindowState.Maximized
        Me.GroupBox1.ResumeLayout(False)
        Me.GroupBox1.PerformLayout()
        Me.GroupBox2.ResumeLayout(False)
        Me.GroupBox2.PerformLayout()
        CType(Me.GridStudProfiles, System.ComponentModel.ISupportInitialize).EndInit()
        CType(Me.ErrorProvider1, System.ComponentModel.ISupportInitialize).EndInit()
        Me.ResumeLayout(False)

    End Sub
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents txtStdName As System.Windows.Forms.TextBox
    Friend WithEvents txtStdParJop As System.Windows.Forms.TextBox
    Friend WithEvents Label11 As System.Windows.Forms.Label
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents Label3 As System.Windows.Forms.Label
    Friend WithEvents Label6 As System.Windows.Forms.Label
    Friend WithEvents txtStdAdderess As System.Windows.Forms.TextBox
    Friend WithEvents Label2 As System.Windows.Forms.Label
    Friend WithEvents Button3 As System.Windows.Forms.Button
    Friend WithEvents Button2 As System.Windows.Forms.Button
    Friend WithEvents txtStdIndex As System.Windows.Forms.TextBox
    Friend WithEvents Label4 As System.Windows.Forms.Label
    Friend WithEvents GroupBox2 As System.Windows.Forms.GroupBox
    Friend WithEvents GridStudProfiles As System.Windows.Forms.DataGridView
    Friend WithEvents txtStudNameSearch As System.Windows.Forms.TextBox
    Friend WithEvents Label5 As System.Windows.Forms.Label
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents txtTutionFee As System.Windows.Forms.TextBox
    Friend WithEvents Label7 As System.Windows.Forms.Label
    Friend WithEvents Label9 As System.Windows.Forms.Label
    Friend WithEvents txtWrittenValue As System.Windows.Forms.TextBox
    Friend WithEvents combNationality As System.Windows.Forms.ComboBox
    Friend WithEvents Label8 As System.Windows.Forms.Label
    Friend WithEvents ErrorProvider1 As System.Windows.Forms.ErrorProvider
    Friend WithEvents Label10 As System.Windows.Forms.Label
    Friend WithEvents ComboBox1 As System.Windows.Forms.ComboBox
    Friend WithEvents Label12 As System.Windows.Forms.Label
    Friend WithEvents Label17 As System.Windows.Forms.Label
    Friend WithEvents txtReasonofIndecent As System.Windows.Forms.TextBox
    Friend WithEvents Button4 As System.Windows.Forms.Button
    Friend WithEvents CmbAdmiTyp As System.Windows.Forms.ComboBox
    Friend WithEvents Label13 As System.Windows.Forms.Label
    Friend WithEvents Label43 As System.Windows.Forms.Label
    Friend WithEvents CombType As System.Windows.Forms.ComboBox
    Friend WithEvents TxtYear As System.Windows.Forms.TextBox
    Friend WithEvents DateTimePicker1 As System.Windows.Forms.DateTimePicker
    Friend WithEvents CombColleg As System.Windows.Forms.ComboBox
    Friend WithEvents Label14 As System.Windows.Forms.Label
    Friend WithEvents TxtProgram As System.Windows.Forms.TextBox
    Friend WithEvents Column3 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column2 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column4 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column5 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column9 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column10 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column6 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column7 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column8 As System.Windows.Forms.DataGridViewButtonColumn
    Friend WithEvents Column11 As System.Windows.Forms.DataGridViewButtonColumn
    Friend WithEvents TxtRe As System.Windows.Forms.TextBox
    Friend WithEvents Label15 As System.Windows.Forms.Label
End Class
