<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frmFinRegestration
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
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmFinRegestration))
        Me.GroupBox1 = New System.Windows.Forms.GroupBox()
        Me.Label11 = New System.Windows.Forms.Label()
        Me.txtBatch = New System.Windows.Forms.TextBox()
        Me.Label10 = New System.Windows.Forms.Label()
        Me.txtProgram = New System.Windows.Forms.TextBox()
        Me.Button4 = New System.Windows.Forms.Button()
        Me.txtStdName = New System.Windows.Forms.TextBox()
        Me.Label13 = New System.Windows.Forms.Label()
        Me.txtStdIndex = New System.Windows.Forms.TextBox()
        Me.Label1 = New System.Windows.Forms.Label()
        Me.GroupBox2 = New System.Windows.Forms.GroupBox()
        Me.txtDiscountPerc = New System.Windows.Forms.NumericUpDown()
        Me.btnAdd = New System.Windows.Forms.Button()
        Me.combLevel = New System.Windows.Forms.ComboBox()
        Me.Label5 = New System.Windows.Forms.Label()
        Me.CombAcdYear = New System.Windows.Forms.ComboBox()
        Me.Label2 = New System.Windows.Forms.Label()
        Me.txtTuitionFeesafterdiscount = New System.Windows.Forms.TextBox()
        Me.Label9 = New System.Windows.Forms.Label()
        Me.txtDiscDescr = New System.Windows.Forms.TextBox()
        Me.Label8 = New System.Windows.Forms.Label()
        Me.txtTuitionFees = New System.Windows.Forms.TextBox()
        Me.Label6 = New System.Windows.Forms.Label()
        Me.Label3 = New System.Windows.Forms.Label()
        Me.txtRegFees = New System.Windows.Forms.TextBox()
        Me.Label4 = New System.Windows.Forms.Label()
        Me.Label7 = New System.Windows.Forms.Label()
        Me.Button3 = New System.Windows.Forms.Button()
        Me.Button2 = New System.Windows.Forms.Button()
        Me.Button1 = New System.Windows.Forms.Button()
        Me.ErrProvider = New System.Windows.Forms.ErrorProvider(Me.components)
        Me.ListView1 = New System.Windows.Forms.ListView()
        Me.ColumnHeader4 = CType(New System.Windows.Forms.ColumnHeader(), System.Windows.Forms.ColumnHeader)
        Me.ColumnHeader8 = CType(New System.Windows.Forms.ColumnHeader(), System.Windows.Forms.ColumnHeader)
        Me.ColumnHeader7 = CType(New System.Windows.Forms.ColumnHeader(), System.Windows.Forms.ColumnHeader)
        Me.ColumnHeader1 = CType(New System.Windows.Forms.ColumnHeader(), System.Windows.Forms.ColumnHeader)
        Me.ColumnHeader2 = CType(New System.Windows.Forms.ColumnHeader(), System.Windows.Forms.ColumnHeader)
        Me.ColumnHeader3 = CType(New System.Windows.Forms.ColumnHeader(), System.Windows.Forms.ColumnHeader)
        Me.ColumnHeader5 = CType(New System.Windows.Forms.ColumnHeader(), System.Windows.Forms.ColumnHeader)
        Me.ColumnHeader6 = CType(New System.Windows.Forms.ColumnHeader(), System.Windows.Forms.ColumnHeader)
        Me.Button5 = New System.Windows.Forms.Button()
        Me.GroupBox1.SuspendLayout()
        Me.GroupBox2.SuspendLayout()
        CType(Me.txtDiscountPerc, System.ComponentModel.ISupportInitialize).BeginInit()
        CType(Me.ErrProvider, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.SuspendLayout()
        '
        'GroupBox1
        '
        Me.GroupBox1.Anchor = CType(((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox1.Controls.Add(Me.Label11)
        Me.GroupBox1.Controls.Add(Me.txtBatch)
        Me.GroupBox1.Controls.Add(Me.Label10)
        Me.GroupBox1.Controls.Add(Me.txtProgram)
        Me.GroupBox1.Controls.Add(Me.Button4)
        Me.GroupBox1.Controls.Add(Me.txtStdName)
        Me.GroupBox1.Controls.Add(Me.Label13)
        Me.GroupBox1.Controls.Add(Me.txtStdIndex)
        Me.GroupBox1.Controls.Add(Me.Label1)
        Me.GroupBox1.Location = New System.Drawing.Point(6, 7)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(839, 70)
        Me.GroupBox1.TabIndex = 1
        Me.GroupBox1.TabStop = False
        Me.GroupBox1.Text = "بيانات الطلاب"
        '
        'Label11
        '
        Me.Label11.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label11.AutoSize = True
        Me.Label11.Location = New System.Drawing.Point(724, 20)
        Me.Label11.Name = "Label11"
        Me.Label11.Size = New System.Drawing.Size(80, 13)
        Me.Label11.TabIndex = 40
        Me.Label11.Text = "الرقم الجامعي :"
        '
        'txtBatch
        '
        Me.txtBatch.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtBatch.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtBatch.Location = New System.Drawing.Point(49, 44)
        Me.txtBatch.Name = "txtBatch"
        Me.txtBatch.ReadOnly = True
        Me.txtBatch.Size = New System.Drawing.Size(128, 20)
        Me.txtBatch.TabIndex = 39
        Me.txtBatch.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label10
        '
        Me.Label10.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label10.AutoSize = True
        Me.Label10.Location = New System.Drawing.Point(183, 47)
        Me.Label10.Name = "Label10"
        Me.Label10.Size = New System.Drawing.Size(43, 13)
        Me.Label10.TabIndex = 38
        Me.Label10.Text = "الدفعة :"
        '
        'txtProgram
        '
        Me.txtProgram.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtProgram.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtProgram.Location = New System.Drawing.Point(302, 44)
        Me.txtProgram.Name = "txtProgram"
        Me.txtProgram.ReadOnly = True
        Me.txtProgram.Size = New System.Drawing.Size(138, 20)
        Me.txtProgram.TabIndex = 37
        Me.txtProgram.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Button4
        '
        Me.Button4.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Button4.Location = New System.Drawing.Point(565, 14)
        Me.Button4.Name = "Button4"
        Me.Button4.Size = New System.Drawing.Size(30, 24)
        Me.Button4.TabIndex = 2
        Me.Button4.Text = "...."
        Me.Button4.UseVisualStyleBackColor = True
        '
        'txtStdName
        '
        Me.txtStdName.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtStdName.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtStdName.Location = New System.Drawing.Point(512, 42)
        Me.txtStdName.Name = "txtStdName"
        Me.txtStdName.ReadOnly = True
        Me.txtStdName.Size = New System.Drawing.Size(206, 20)
        Me.txtStdName.TabIndex = 1
        '
        'Label13
        '
        Me.Label13.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label13.AutoSize = True
        Me.Label13.Location = New System.Drawing.Point(724, 46)
        Me.Label13.Name = "Label13"
        Me.Label13.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label13.Size = New System.Drawing.Size(43, 13)
        Me.Label13.TabIndex = 0
        Me.Label13.Text = "الإسم :"
        '
        'txtStdIndex
        '
        Me.txtStdIndex.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtStdIndex.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtStdIndex.Location = New System.Drawing.Point(600, 16)
        Me.txtStdIndex.Name = "txtStdIndex"
        Me.txtStdIndex.Size = New System.Drawing.Size(118, 20)
        Me.txtStdIndex.TabIndex = 0
        Me.txtStdIndex.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label1
        '
        Me.Label1.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label1.AutoSize = True
        Me.Label1.Location = New System.Drawing.Point(446, 47)
        Me.Label1.Name = "Label1"
        Me.Label1.Size = New System.Drawing.Size(49, 13)
        Me.Label1.TabIndex = 2
        Me.Label1.Text = "البرنامج :"
        '
        'GroupBox2
        '
        Me.GroupBox2.Anchor = CType(((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox2.Controls.Add(Me.txtDiscountPerc)
        Me.GroupBox2.Controls.Add(Me.btnAdd)
        Me.GroupBox2.Controls.Add(Me.combLevel)
        Me.GroupBox2.Controls.Add(Me.Label5)
        Me.GroupBox2.Controls.Add(Me.CombAcdYear)
        Me.GroupBox2.Controls.Add(Me.Label2)
        Me.GroupBox2.Controls.Add(Me.txtTuitionFeesafterdiscount)
        Me.GroupBox2.Controls.Add(Me.Label9)
        Me.GroupBox2.Controls.Add(Me.txtDiscDescr)
        Me.GroupBox2.Controls.Add(Me.Label8)
        Me.GroupBox2.Controls.Add(Me.txtTuitionFees)
        Me.GroupBox2.Controls.Add(Me.Label6)
        Me.GroupBox2.Controls.Add(Me.Label3)
        Me.GroupBox2.Controls.Add(Me.txtRegFees)
        Me.GroupBox2.Controls.Add(Me.Label4)
        Me.GroupBox2.Controls.Add(Me.Label7)
        Me.GroupBox2.Location = New System.Drawing.Point(6, 83)
        Me.GroupBox2.Name = "GroupBox2"
        Me.GroupBox2.Size = New System.Drawing.Size(839, 98)
        Me.GroupBox2.TabIndex = 2
        Me.GroupBox2.TabStop = False
        Me.GroupBox2.Text = "بيانات التسجيل"
        '
        'txtDiscountPerc
        '
        Me.txtDiscountPerc.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtDiscountPerc.DecimalPlaces = 2
        Me.txtDiscountPerc.Location = New System.Drawing.Point(619, 41)
        Me.txtDiscountPerc.Name = "txtDiscountPerc"
        Me.txtDiscountPerc.Size = New System.Drawing.Size(99, 20)
        Me.txtDiscountPerc.TabIndex = 47
        '
        'btnAdd
        '
        Me.btnAdd.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.btnAdd.Location = New System.Drawing.Point(13, 13)
        Me.btnAdd.Name = "btnAdd"
        Me.btnAdd.Size = New System.Drawing.Size(30, 24)
        Me.btnAdd.TabIndex = 38
        Me.btnAdd.Text = "+"
        Me.btnAdd.UseVisualStyleBackColor = True
        '
        'combLevel
        '
        Me.combLevel.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.combLevel.AutoCompleteCustomSource.AddRange(New String() {""})
        Me.combLevel.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.combLevel.ForeColor = System.Drawing.SystemColors.WindowText
        Me.combLevel.FormattingEnabled = True
        Me.combLevel.Location = New System.Drawing.Point(49, 41)
        Me.combLevel.Name = "combLevel"
        Me.combLevel.Size = New System.Drawing.Size(128, 21)
        Me.combLevel.TabIndex = 46
        '
        'Label5
        '
        Me.Label5.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label5.AutoSize = True
        Me.Label5.Location = New System.Drawing.Point(183, 45)
        Me.Label5.Name = "Label5"
        Me.Label5.Size = New System.Drawing.Size(83, 13)
        Me.Label5.TabIndex = 45
        Me.Label5.Text = "الصف الدراسي :"
        Me.Label5.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'CombAcdYear
        '
        Me.CombAcdYear.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.CombAcdYear.AutoCompleteCustomSource.AddRange(New String() {""})
        Me.CombAcdYear.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombAcdYear.ForeColor = System.Drawing.SystemColors.WindowText
        Me.CombAcdYear.FormattingEnabled = True
        Me.CombAcdYear.Items.AddRange(New Object() {"الفصل الدراسي الأول", "الفصل الدراسي الثاني"})
        Me.CombAcdYear.Location = New System.Drawing.Point(49, 15)
        Me.CombAcdYear.Name = "CombAcdYear"
        Me.CombAcdYear.Size = New System.Drawing.Size(128, 21)
        Me.CombAcdYear.TabIndex = 44
        '
        'Label2
        '
        Me.Label2.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label2.AutoSize = True
        Me.Label2.Location = New System.Drawing.Point(724, 71)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(109, 13)
        Me.Label2.TabIndex = 43
        Me.Label2.Text = "الرسوم بعد التخفيض :"
        '
        'txtTuitionFeesafterdiscount
        '
        Me.txtTuitionFeesafterdiscount.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtTuitionFeesafterdiscount.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtTuitionFeesafterdiscount.Location = New System.Drawing.Point(619, 67)
        Me.txtTuitionFeesafterdiscount.Name = "txtTuitionFeesafterdiscount"
        Me.txtTuitionFeesafterdiscount.ReadOnly = True
        Me.txtTuitionFeesafterdiscount.Size = New System.Drawing.Size(99, 20)
        Me.txtTuitionFeesafterdiscount.TabIndex = 42
        Me.txtTuitionFeesafterdiscount.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label9
        '
        Me.Label9.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label9.AutoSize = True
        Me.Label9.Location = New System.Drawing.Point(500, 45)
        Me.Label9.Name = "Label9"
        Me.Label9.Size = New System.Drawing.Size(82, 13)
        Me.Label9.TabIndex = 41
        Me.Label9.Text = "سبب التخفيض :"
        '
        'txtDiscDescr
        '
        Me.txtDiscDescr.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtDiscDescr.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtDiscDescr.Location = New System.Drawing.Point(302, 41)
        Me.txtDiscDescr.Name = "txtDiscDescr"
        Me.txtDiscDescr.Size = New System.Drawing.Size(192, 20)
        Me.txtDiscDescr.TabIndex = 1
        '
        'Label8
        '
        Me.Label8.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label8.AutoSize = True
        Me.Label8.Location = New System.Drawing.Point(595, 45)
        Me.Label8.Name = "Label8"
        Me.Label8.Size = New System.Drawing.Size(18, 13)
        Me.Label8.TabIndex = 39
        Me.Label8.Text = "%"
        '
        'txtTuitionFees
        '
        Me.txtTuitionFees.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtTuitionFees.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtTuitionFees.Location = New System.Drawing.Point(619, 15)
        Me.txtTuitionFees.Name = "txtTuitionFees"
        Me.txtTuitionFees.ReadOnly = True
        Me.txtTuitionFees.Size = New System.Drawing.Size(99, 20)
        Me.txtTuitionFees.TabIndex = 2
        Me.txtTuitionFees.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label6
        '
        Me.Label6.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label6.AutoSize = True
        Me.Label6.Location = New System.Drawing.Point(724, 45)
        Me.Label6.Name = "Label6"
        Me.Label6.Size = New System.Drawing.Size(82, 13)
        Me.Label6.TabIndex = 38
        Me.Label6.Text = "نسبة التخفيض :"
        '
        'Label3
        '
        Me.Label3.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label3.AutoSize = True
        Me.Label3.Location = New System.Drawing.Point(501, 19)
        Me.Label3.Name = "Label3"
        Me.Label3.Size = New System.Drawing.Size(85, 13)
        Me.Label3.TabIndex = 34
        Me.Label3.Text = "رسوم التسجيل :"
        '
        'txtRegFees
        '
        Me.txtRegFees.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtRegFees.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtRegFees.Location = New System.Drawing.Point(424, 15)
        Me.txtRegFees.Name = "txtRegFees"
        Me.txtRegFees.ReadOnly = True
        Me.txtRegFees.Size = New System.Drawing.Size(70, 20)
        Me.txtRegFees.TabIndex = 3
        Me.txtRegFees.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label4
        '
        Me.Label4.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label4.AutoSize = True
        Me.Label4.Location = New System.Drawing.Point(724, 19)
        Me.Label4.Name = "Label4"
        Me.Label4.Size = New System.Drawing.Size(91, 13)
        Me.Label4.TabIndex = 31
        Me.Label4.Text = "الرسوم الدراسية :"
        '
        'Label7
        '
        Me.Label7.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label7.AutoSize = True
        Me.Label7.Location = New System.Drawing.Point(183, 19)
        Me.Label7.Name = "Label7"
        Me.Label7.Size = New System.Drawing.Size(80, 13)
        Me.Label7.TabIndex = 28
        Me.Label7.Text = "العام الدراسي :"
        Me.Label7.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Button3
        '
        Me.Button3.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Button3.Location = New System.Drawing.Point(73, 185)
        Me.Button3.Name = "Button3"
        Me.Button3.Size = New System.Drawing.Size(75, 32)
        Me.Button3.TabIndex = 5
        Me.Button3.Text = "مسح"
        Me.Button3.UseVisualStyleBackColor = True
        '
        'Button2
        '
        Me.Button2.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Button2.Location = New System.Drawing.Point(187, 185)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(75, 32)
        Me.Button2.TabIndex = 4
        Me.Button2.Text = "حفظ"
        Me.Button2.UseVisualStyleBackColor = True
        '
        'Button1
        '
        Me.Button1.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left), System.Windows.Forms.AnchorStyles)
        Me.Button1.Location = New System.Drawing.Point(73, 424)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 32)
        Me.Button1.TabIndex = 6
        Me.Button1.Text = "خروج"
        Me.Button1.UseVisualStyleBackColor = True
        '
        'ErrProvider
        '
        Me.ErrProvider.ContainerControl = Me
        '
        'ListView1
        '
        Me.ListView1.Anchor = CType((((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Bottom) _
            Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.ListView1.Columns.AddRange(New System.Windows.Forms.ColumnHeader() {Me.ColumnHeader4, Me.ColumnHeader8, Me.ColumnHeader7, Me.ColumnHeader1, Me.ColumnHeader2, Me.ColumnHeader3, Me.ColumnHeader5, Me.ColumnHeader6})
        Me.ListView1.Font = New System.Drawing.Font("Times New Roman", 12.0!)
        Me.ListView1.FullRowSelect = True
        Me.ListView1.GridLines = True
        Me.ListView1.Location = New System.Drawing.Point(6, 223)
        Me.ListView1.MultiSelect = False
        Me.ListView1.Name = "ListView1"
        Me.ListView1.RightToLeftLayout = True
        Me.ListView1.Size = New System.Drawing.Size(844, 195)
        Me.ListView1.TabIndex = 7
        Me.ListView1.UseCompatibleStateImageBehavior = False
        Me.ListView1.View = System.Windows.Forms.View.Details
        '
        'ColumnHeader4
        '
        Me.ColumnHeader4.Text = "SNo"
        Me.ColumnHeader4.Width = 0
        '
        'ColumnHeader8
        '
        Me.ColumnHeader8.Text = "البرنامج"
        Me.ColumnHeader8.Width = 156
        '
        'ColumnHeader7
        '
        Me.ColumnHeader7.Text = "الصف الدراسي"
        Me.ColumnHeader7.Width = 96
        '
        'ColumnHeader1
        '
        Me.ColumnHeader1.Text = "العام الدراسي"
        Me.ColumnHeader1.Width = 92
        '
        'ColumnHeader2
        '
        Me.ColumnHeader2.Text = "الرسوم الدراسية"
        Me.ColumnHeader2.Width = 101
        '
        'ColumnHeader3
        '
        Me.ColumnHeader3.Text = "رسوم التسجيل"
        Me.ColumnHeader3.Width = 90
        '
        'ColumnHeader5
        '
        Me.ColumnHeader5.Text = "نسبة التخفيض %"
        Me.ColumnHeader5.Width = 112
        '
        'ColumnHeader6
        '
        Me.ColumnHeader6.Text = "سبب التخفيض"
        Me.ColumnHeader6.Width = 320
        '
        'Button5
        '
        Me.Button5.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left), System.Windows.Forms.AnchorStyles)
        Me.Button5.Location = New System.Drawing.Point(187, 424)
        Me.Button5.Name = "Button5"
        Me.Button5.Size = New System.Drawing.Size(75, 32)
        Me.Button5.TabIndex = 8
        Me.Button5.Text = "مسح"
        Me.Button5.UseVisualStyleBackColor = True
        '
        'frmFinRegestration
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(857, 460)
        Me.Controls.Add(Me.Button5)
        Me.Controls.Add(Me.ListView1)
        Me.Controls.Add(Me.Button1)
        Me.Controls.Add(Me.Button3)
        Me.Controls.Add(Me.Button2)
        Me.Controls.Add(Me.GroupBox2)
        Me.Controls.Add(Me.GroupBox1)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MinimumSize = New System.Drawing.Size(873, 498)
        Me.Name = "frmFinRegestration"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "فتح حساب طالب"
        Me.WindowState = System.Windows.Forms.FormWindowState.Maximized
        Me.GroupBox1.ResumeLayout(False)
        Me.GroupBox1.PerformLayout()
        Me.GroupBox2.ResumeLayout(False)
        Me.GroupBox2.PerformLayout()
        CType(Me.txtDiscountPerc, System.ComponentModel.ISupportInitialize).EndInit()
        CType(Me.ErrProvider, System.ComponentModel.ISupportInitialize).EndInit()
        Me.ResumeLayout(False)

    End Sub
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents Label11 As System.Windows.Forms.Label
    Friend WithEvents txtBatch As System.Windows.Forms.TextBox
    Friend WithEvents Label10 As System.Windows.Forms.Label
    Friend WithEvents txtProgram As System.Windows.Forms.TextBox
    Friend WithEvents Button4 As System.Windows.Forms.Button
    Friend WithEvents txtStdName As System.Windows.Forms.TextBox
    Friend WithEvents Label13 As System.Windows.Forms.Label
    Friend WithEvents txtStdIndex As System.Windows.Forms.TextBox
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents GroupBox2 As System.Windows.Forms.GroupBox
    Friend WithEvents txtDiscountPerc As System.Windows.Forms.NumericUpDown
    Friend WithEvents btnAdd As System.Windows.Forms.Button
    Friend WithEvents combLevel As System.Windows.Forms.ComboBox
    Friend WithEvents Label5 As System.Windows.Forms.Label
    Friend WithEvents CombAcdYear As System.Windows.Forms.ComboBox
    Friend WithEvents Label2 As System.Windows.Forms.Label
    Friend WithEvents txtTuitionFeesafterdiscount As System.Windows.Forms.TextBox
    Friend WithEvents Label9 As System.Windows.Forms.Label
    Friend WithEvents txtDiscDescr As System.Windows.Forms.TextBox
    Friend WithEvents Label8 As System.Windows.Forms.Label
    Friend WithEvents txtTuitionFees As System.Windows.Forms.TextBox
    Friend WithEvents Label6 As System.Windows.Forms.Label
    Friend WithEvents Label3 As System.Windows.Forms.Label
    Friend WithEvents txtRegFees As System.Windows.Forms.TextBox
    Friend WithEvents Label4 As System.Windows.Forms.Label
    Friend WithEvents Label7 As System.Windows.Forms.Label
    Friend WithEvents Button3 As System.Windows.Forms.Button
    Friend WithEvents Button2 As System.Windows.Forms.Button
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents ErrProvider As System.Windows.Forms.ErrorProvider
    Friend WithEvents ListView1 As System.Windows.Forms.ListView
    Friend WithEvents ColumnHeader4 As System.Windows.Forms.ColumnHeader
    Friend WithEvents ColumnHeader8 As System.Windows.Forms.ColumnHeader
    Friend WithEvents ColumnHeader7 As System.Windows.Forms.ColumnHeader
    Friend WithEvents ColumnHeader1 As System.Windows.Forms.ColumnHeader
    Friend WithEvents ColumnHeader2 As System.Windows.Forms.ColumnHeader
    Friend WithEvents ColumnHeader3 As System.Windows.Forms.ColumnHeader
    Friend WithEvents ColumnHeader5 As System.Windows.Forms.ColumnHeader
    Friend WithEvents ColumnHeader6 As System.Windows.Forms.ColumnHeader
    Friend WithEvents Button5 As System.Windows.Forms.Button
End Class
