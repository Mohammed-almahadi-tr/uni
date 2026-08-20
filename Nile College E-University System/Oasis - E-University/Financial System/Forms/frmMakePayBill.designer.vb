<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frmMakePayBill
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
        Dim DataGridViewCellStyle4 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim DataGridViewCellStyle5 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim DataGridViewCellStyle6 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmMakePayBill))
        Me.Button1 = New System.Windows.Forms.Button()
        Me.btnGClose = New System.Windows.Forms.Button()
        Me.btnGSave = New System.Windows.Forms.Button()
        Me.Label1 = New System.Windows.Forms.Label()
        Me.DTPCheq = New System.Windows.Forms.DateTimePicker()
        Me.GroupBox5 = New System.Windows.Forms.GroupBox()
        Me.Label7 = New System.Windows.Forms.Label()
        Me.txtSource = New System.Windows.Forms.TextBox()
        Me.txtDescr = New System.Windows.Forms.TextBox()
        Me.Label9 = New System.Windows.Forms.Label()
        Me.GridVouchers = New System.Windows.Forms.DataGridView()
        Me.GroupBox3 = New System.Windows.Forms.GroupBox()
        Me.txtAcc5 = New System.Windows.Forms.TextBox()
        Me.ComboDepart = New System.Windows.Forms.ComboBox()
        Me.Label10 = New System.Windows.Forms.Label()
        Me.Label8 = New System.Windows.Forms.Label()
        Me.Button3 = New System.Windows.Forms.Button()
        Me.Button2 = New System.Windows.Forms.Button()
        Me.txtAcc4 = New System.Windows.Forms.TextBox()
        Me.Label5 = New System.Windows.Forms.Label()
        Me.txtAcc3 = New System.Windows.Forms.TextBox()
        Me.txtAmount = New System.Windows.Forms.TextBox()
        Me.txtAcc2 = New System.Windows.Forms.TextBox()
        Me.txtAcc1 = New System.Windows.Forms.TextBox()
        Me.GroupBox4 = New System.Windows.Forms.GroupBox()
        Me.Label3 = New System.Windows.Forms.Label()
        Me.txtWrittenValue = New System.Windows.Forms.TextBox()
        Me.Label2 = New System.Windows.Forms.Label()
        Me.txtTotalAmount = New System.Windows.Forms.TextBox()
        Me.GroupBox2 = New System.Windows.Forms.GroupBox()
        Me.GroupBox7 = New System.Windows.Forms.GroupBox()
        Me.txtAc5 = New System.Windows.Forms.TextBox()
        Me.btnSearch = New System.Windows.Forms.Button()
        Me.txtAc4 = New System.Windows.Forms.TextBox()
        Me.txtAc3 = New System.Windows.Forms.TextBox()
        Me.txtAc2 = New System.Windows.Forms.TextBox()
        Me.txtAc1 = New System.Windows.Forms.TextBox()
        Me.ROther = New System.Windows.Forms.RadioButton()
        Me.Label4 = New System.Windows.Forms.Label()
        Me.CombBank = New System.Windows.Forms.ComboBox()
        Me.txtChNo = New System.Windows.Forms.TextBox()
        Me.RBank = New System.Windows.Forms.RadioButton()
        Me.RCash = New System.Windows.Forms.RadioButton()
        Me.ErrProv = New System.Windows.Forms.ErrorProvider(Me.components)
        Me.Label6 = New System.Windows.Forms.Label()
        Me.DTPTrans = New System.Windows.Forms.DateTimePicker()
        Me.TreeAcc = New System.Windows.Forms.TreeView()
        Me.Package = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Acc = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column3 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column4 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column1 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column5 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Credit = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column2 = New System.Windows.Forms.DataGridViewButtonColumn()
        Me.GroupBox5.SuspendLayout()
        CType(Me.GridVouchers, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.GroupBox3.SuspendLayout()
        Me.GroupBox4.SuspendLayout()
        Me.GroupBox7.SuspendLayout()
        CType(Me.ErrProv, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.SuspendLayout()
        '
        'Button1
        '
        Me.Button1.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Button1.Location = New System.Drawing.Point(929, 446)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 32)
        Me.Button1.TabIndex = 9
        Me.Button1.Text = "مسح"
        '
        'btnGClose
        '
        Me.btnGClose.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.btnGClose.Location = New System.Drawing.Point(1139, 446)
        Me.btnGClose.Name = "btnGClose"
        Me.btnGClose.Size = New System.Drawing.Size(75, 32)
        Me.btnGClose.TabIndex = 10
        Me.btnGClose.Text = "اغلاق"
        '
        'btnGSave
        '
        Me.btnGSave.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.btnGSave.Location = New System.Drawing.Point(836, 446)
        Me.btnGSave.Name = "btnGSave"
        Me.btnGSave.Size = New System.Drawing.Size(75, 32)
        Me.btnGSave.TabIndex = 8
        Me.btnGSave.Text = "حفظ"
        '
        'Label1
        '
        Me.Label1.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label1.AutoSize = True
        Me.Label1.Location = New System.Drawing.Point(151, 25)
        Me.Label1.Name = "Label1"
        Me.Label1.Size = New System.Drawing.Size(62, 13)
        Me.Label1.TabIndex = 18
        Me.Label1.Text = "تاريخ الشيك"
        '
        'DTPCheq
        '
        Me.DTPCheq.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.DTPCheq.CustomFormat = "dd/MM/yyyy"
        Me.DTPCheq.Format = System.Windows.Forms.DateTimePickerFormat.Custom
        Me.DTPCheq.Location = New System.Drawing.Point(12, 22)
        Me.DTPCheq.Name = "DTPCheq"
        Me.DTPCheq.Size = New System.Drawing.Size(134, 20)
        Me.DTPCheq.TabIndex = 17
        '
        'GroupBox5
        '
        Me.GroupBox5.Anchor = CType(((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox5.Controls.Add(Me.Label7)
        Me.GroupBox5.Controls.Add(Me.txtSource)
        Me.GroupBox5.Controls.Add(Me.txtDescr)
        Me.GroupBox5.Controls.Add(Me.Label9)
        Me.GroupBox5.Location = New System.Drawing.Point(267, 4)
        Me.GroupBox5.Name = "GroupBox5"
        Me.GroupBox5.Size = New System.Drawing.Size(749, 48)
        Me.GroupBox5.TabIndex = 2
        Me.GroupBox5.TabStop = False
        '
        'Label7
        '
        Me.Label7.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label7.AutoSize = True
        Me.Label7.Location = New System.Drawing.Point(700, 23)
        Me.Label7.Name = "Label7"
        Me.Label7.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label7.Size = New System.Drawing.Size(41, 13)
        Me.Label7.TabIndex = 22
        Me.Label7.Text = "ادفعو ل"
        '
        'txtSource
        '
        Me.txtSource.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtSource.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtSource.Location = New System.Drawing.Point(378, 21)
        Me.txtSource.Name = "txtSource"
        Me.txtSource.Size = New System.Drawing.Size(316, 20)
        Me.txtSource.TabIndex = 0
        '
        'txtDescr
        '
        Me.txtDescr.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtDescr.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtDescr.Location = New System.Drawing.Point(12, 21)
        Me.txtDescr.Name = "txtDescr"
        Me.txtDescr.Size = New System.Drawing.Size(299, 20)
        Me.txtDescr.TabIndex = 0
        '
        'Label9
        '
        Me.Label9.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label9.AutoSize = True
        Me.Label9.Location = New System.Drawing.Point(317, 23)
        Me.Label9.Name = "Label9"
        Me.Label9.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label9.Size = New System.Drawing.Size(48, 13)
        Me.Label9.TabIndex = 23
        Me.Label9.Text = "عبارة عن"
        '
        'GridVouchers
        '
        Me.GridVouchers.AllowUserToAddRows = False
        Me.GridVouchers.AllowUserToResizeRows = False
        DataGridViewCellStyle1.BackColor = System.Drawing.Color.Khaki
        Me.GridVouchers.AlternatingRowsDefaultCellStyle = DataGridViewCellStyle1
        Me.GridVouchers.Anchor = CType((((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Bottom) _
            Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GridVouchers.AutoSizeRowsMode = System.Windows.Forms.DataGridViewAutoSizeRowsMode.AllCells
        Me.GridVouchers.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.AutoSize
        Me.GridVouchers.Columns.AddRange(New System.Windows.Forms.DataGridViewColumn() {Me.Package, Me.Acc, Me.Column3, Me.Column4, Me.Column1, Me.Column5, Me.Credit, Me.Column2})
        Me.GridVouchers.Location = New System.Drawing.Point(267, 137)
        Me.GridVouchers.Name = "GridVouchers"
        Me.GridVouchers.ReadOnly = True
        Me.GridVouchers.Size = New System.Drawing.Size(749, 134)
        Me.GridVouchers.TabIndex = 4
        '
        'GroupBox3
        '
        Me.GroupBox3.Anchor = CType(((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox3.Controls.Add(Me.txtAcc5)
        Me.GroupBox3.Controls.Add(Me.ComboDepart)
        Me.GroupBox3.Controls.Add(Me.Label10)
        Me.GroupBox3.Controls.Add(Me.Label8)
        Me.GroupBox3.Controls.Add(Me.Button3)
        Me.GroupBox3.Controls.Add(Me.Button2)
        Me.GroupBox3.Controls.Add(Me.txtAcc4)
        Me.GroupBox3.Controls.Add(Me.Label5)
        Me.GroupBox3.Controls.Add(Me.txtAcc3)
        Me.GroupBox3.Controls.Add(Me.txtAmount)
        Me.GroupBox3.Controls.Add(Me.txtAcc2)
        Me.GroupBox3.Controls.Add(Me.txtAcc1)
        Me.GroupBox3.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.GroupBox3.Location = New System.Drawing.Point(267, 56)
        Me.GroupBox3.Name = "GroupBox3"
        Me.GroupBox3.Size = New System.Drawing.Size(749, 75)
        Me.GroupBox3.TabIndex = 3
        Me.GroupBox3.TabStop = False
        Me.GroupBox3.Text = "Account (Debit Side)"
        '
        'txtAcc5
        '
        Me.txtAcc5.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtAcc5.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAcc5.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtAcc5.Location = New System.Drawing.Point(90, 17)
        Me.txtAcc5.Name = "txtAcc5"
        Me.txtAcc5.ReadOnly = True
        Me.txtAcc5.Size = New System.Drawing.Size(111, 21)
        Me.txtAcc5.TabIndex = 26
        '
        'ComboDepart
        '
        Me.ComboDepart.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.ComboDepart.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.ComboDepart.FormattingEnabled = True
        Me.ComboDepart.Items.AddRange(New Object() {"الخدمات", "العلاقات الخارجية", "شؤن الافراد", "مركز تقنية المعلومات"})
        Me.ComboDepart.Location = New System.Drawing.Point(503, 46)
        Me.ComboDepart.Name = "ComboDepart"
        Me.ComboDepart.Size = New System.Drawing.Size(167, 21)
        Me.ComboDepart.TabIndex = 24
        '
        'Label10
        '
        Me.Label10.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label10.AutoSize = True
        Me.Label10.Location = New System.Drawing.Point(676, 20)
        Me.Label10.Name = "Label10"
        Me.Label10.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label10.Size = New System.Drawing.Size(44, 13)
        Me.Label10.TabIndex = 23
        Me.Label10.Text = "الحساب"
        '
        'Label8
        '
        Me.Label8.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label8.AutoSize = True
        Me.Label8.Location = New System.Drawing.Point(676, 50)
        Me.Label8.Name = "Label8"
        Me.Label8.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label8.Size = New System.Drawing.Size(39, 13)
        Me.Label8.TabIndex = 23
        Me.Label8.Text = "القسم"
        '
        'Button3
        '
        Me.Button3.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Button3.Location = New System.Drawing.Point(12, 14)
        Me.Button3.Name = "Button3"
        Me.Button3.Size = New System.Drawing.Size(72, 23)
        Me.Button3.TabIndex = 4
        Me.Button3.Text = "بحث"
        '
        'Button2
        '
        Me.Button2.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Button2.Location = New System.Drawing.Point(233, 44)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(72, 23)
        Me.Button2.TabIndex = 6
        Me.Button2.Text = "اضافة"
        '
        'txtAcc4
        '
        Me.txtAcc4.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtAcc4.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAcc4.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtAcc4.Location = New System.Drawing.Point(207, 17)
        Me.txtAcc4.Name = "txtAcc4"
        Me.txtAcc4.ReadOnly = True
        Me.txtAcc4.Size = New System.Drawing.Size(111, 21)
        Me.txtAcc4.TabIndex = 3
        '
        'Label5
        '
        Me.Label5.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label5.AutoSize = True
        Me.Label5.Location = New System.Drawing.Point(443, 50)
        Me.Label5.Name = "Label5"
        Me.Label5.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label5.Size = New System.Drawing.Size(37, 13)
        Me.Label5.TabIndex = 18
        Me.Label5.Text = "الرصيد"
        '
        'txtAcc3
        '
        Me.txtAcc3.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtAcc3.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAcc3.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtAcc3.Location = New System.Drawing.Point(324, 17)
        Me.txtAcc3.Name = "txtAcc3"
        Me.txtAcc3.ReadOnly = True
        Me.txtAcc3.Size = New System.Drawing.Size(111, 21)
        Me.txtAcc3.TabIndex = 2
        '
        'txtAmount
        '
        Me.txtAmount.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtAmount.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAmount.Location = New System.Drawing.Point(311, 46)
        Me.txtAmount.Name = "txtAmount"
        Me.txtAmount.Size = New System.Drawing.Size(122, 21)
        Me.txtAmount.TabIndex = 5
        Me.txtAmount.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'txtAcc2
        '
        Me.txtAcc2.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtAcc2.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAcc2.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtAcc2.Location = New System.Drawing.Point(441, 17)
        Me.txtAcc2.Name = "txtAcc2"
        Me.txtAcc2.ReadOnly = True
        Me.txtAcc2.Size = New System.Drawing.Size(111, 21)
        Me.txtAcc2.TabIndex = 1
        '
        'txtAcc1
        '
        Me.txtAcc1.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtAcc1.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAcc1.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtAcc1.Location = New System.Drawing.Point(559, 17)
        Me.txtAcc1.Name = "txtAcc1"
        Me.txtAcc1.ReadOnly = True
        Me.txtAcc1.Size = New System.Drawing.Size(111, 21)
        Me.txtAcc1.TabIndex = 0
        '
        'GroupBox4
        '
        Me.GroupBox4.Anchor = CType(((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox4.Controls.Add(Me.Label3)
        Me.GroupBox4.Controls.Add(Me.txtWrittenValue)
        Me.GroupBox4.Controls.Add(Me.Label2)
        Me.GroupBox4.Controls.Add(Me.txtTotalAmount)
        Me.GroupBox4.Location = New System.Drawing.Point(267, 277)
        Me.GroupBox4.Name = "GroupBox4"
        Me.GroupBox4.Size = New System.Drawing.Size(749, 49)
        Me.GroupBox4.TabIndex = 5
        Me.GroupBox4.TabStop = False
        Me.GroupBox4.Text = "اجمالي الرصيد"
        '
        'Label3
        '
        Me.Label3.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label3.AutoSize = True
        Me.Label3.Location = New System.Drawing.Point(559, 21)
        Me.Label3.Name = "Label3"
        Me.Label3.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label3.Size = New System.Drawing.Size(29, 13)
        Me.Label3.TabIndex = 15
        Me.Label3.Text = "كتابتاً"
        '
        'txtWrittenValue
        '
        Me.txtWrittenValue.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtWrittenValue.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtWrittenValue.Location = New System.Drawing.Point(12, 19)
        Me.txtWrittenValue.Name = "txtWrittenValue"
        Me.txtWrittenValue.ReadOnly = True
        Me.txtWrittenValue.Size = New System.Drawing.Size(541, 20)
        Me.txtWrittenValue.TabIndex = 1
        '
        'Label2
        '
        Me.Label2.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label2.AutoSize = True
        Me.Label2.Location = New System.Drawing.Point(706, 21)
        Me.Label2.Name = "Label2"
        Me.Label2.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label2.Size = New System.Drawing.Size(37, 13)
        Me.Label2.TabIndex = 13
        Me.Label2.Text = "الرصيد"
        '
        'txtTotalAmount
        '
        Me.txtTotalAmount.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtTotalAmount.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtTotalAmount.Location = New System.Drawing.Point(594, 19)
        Me.txtTotalAmount.Name = "txtTotalAmount"
        Me.txtTotalAmount.ReadOnly = True
        Me.txtTotalAmount.Size = New System.Drawing.Size(106, 20)
        Me.txtTotalAmount.TabIndex = 0
        Me.txtTotalAmount.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'GroupBox2
        '
        Me.GroupBox2.Anchor = CType(((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox2.Location = New System.Drawing.Point(267, 437)
        Me.GroupBox2.Name = "GroupBox2"
        Me.GroupBox2.Size = New System.Drawing.Size(749, 10)
        Me.GroupBox2.TabIndex = 125
        Me.GroupBox2.TabStop = False
        '
        'GroupBox7
        '
        Me.GroupBox7.Anchor = CType(((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox7.Controls.Add(Me.txtAc5)
        Me.GroupBox7.Controls.Add(Me.btnSearch)
        Me.GroupBox7.Controls.Add(Me.txtAc4)
        Me.GroupBox7.Controls.Add(Me.txtAc3)
        Me.GroupBox7.Controls.Add(Me.txtAc2)
        Me.GroupBox7.Controls.Add(Me.txtAc1)
        Me.GroupBox7.Controls.Add(Me.ROther)
        Me.GroupBox7.Controls.Add(Me.Label4)
        Me.GroupBox7.Controls.Add(Me.CombBank)
        Me.GroupBox7.Controls.Add(Me.txtChNo)
        Me.GroupBox7.Controls.Add(Me.RBank)
        Me.GroupBox7.Controls.Add(Me.RCash)
        Me.GroupBox7.Controls.Add(Me.DTPCheq)
        Me.GroupBox7.Controls.Add(Me.Label1)
        Me.GroupBox7.Location = New System.Drawing.Point(267, 332)
        Me.GroupBox7.Name = "GroupBox7"
        Me.GroupBox7.Size = New System.Drawing.Size(749, 101)
        Me.GroupBox7.TabIndex = 6
        Me.GroupBox7.TabStop = False
        Me.GroupBox7.Text = "(Cridit Side)"
        '
        'txtAc5
        '
        Me.txtAc5.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtAc5.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAc5.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtAc5.Location = New System.Drawing.Point(105, 60)
        Me.txtAc5.Name = "txtAc5"
        Me.txtAc5.ReadOnly = True
        Me.txtAc5.Size = New System.Drawing.Size(111, 21)
        Me.txtAc5.TabIndex = 32
        '
        'btnSearch
        '
        Me.btnSearch.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.btnSearch.Location = New System.Drawing.Point(12, 60)
        Me.btnSearch.Name = "btnSearch"
        Me.btnSearch.Size = New System.Drawing.Size(72, 23)
        Me.btnSearch.TabIndex = 24
        Me.btnSearch.Text = "بحث"
        Me.btnSearch.Visible = False
        '
        'txtAc4
        '
        Me.txtAc4.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtAc4.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAc4.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtAc4.Location = New System.Drawing.Point(573, 60)
        Me.txtAc4.Name = "txtAc4"
        Me.txtAc4.ReadOnly = True
        Me.txtAc4.Size = New System.Drawing.Size(111, 21)
        Me.txtAc4.TabIndex = 23
        Me.txtAc4.Visible = False
        '
        'txtAc3
        '
        Me.txtAc3.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtAc3.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAc3.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtAc3.Location = New System.Drawing.Point(456, 60)
        Me.txtAc3.Name = "txtAc3"
        Me.txtAc3.ReadOnly = True
        Me.txtAc3.Size = New System.Drawing.Size(111, 21)
        Me.txtAc3.TabIndex = 22
        Me.txtAc3.Visible = False
        '
        'txtAc2
        '
        Me.txtAc2.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtAc2.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAc2.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtAc2.Location = New System.Drawing.Point(339, 60)
        Me.txtAc2.Name = "txtAc2"
        Me.txtAc2.ReadOnly = True
        Me.txtAc2.Size = New System.Drawing.Size(111, 21)
        Me.txtAc2.TabIndex = 21
        Me.txtAc2.Visible = False
        '
        'txtAc1
        '
        Me.txtAc1.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtAc1.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAc1.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtAc1.Location = New System.Drawing.Point(222, 60)
        Me.txtAc1.Name = "txtAc1"
        Me.txtAc1.ReadOnly = True
        Me.txtAc1.Size = New System.Drawing.Size(111, 21)
        Me.txtAc1.TabIndex = 20
        Me.txtAc1.Visible = False
        '
        'ROther
        '
        Me.ROther.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.ROther.AutoSize = True
        Me.ROther.Location = New System.Drawing.Point(690, 60)
        Me.ROther.Name = "ROther"
        Me.ROther.Size = New System.Drawing.Size(50, 17)
        Me.ROther.TabIndex = 19
        Me.ROther.TabStop = True
        Me.ROther.Text = "اخري"
        Me.ROther.UseVisualStyleBackColor = True
        '
        'Label4
        '
        Me.Label4.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label4.AutoSize = True
        Me.Label4.Location = New System.Drawing.Point(436, 24)
        Me.Label4.Name = "Label4"
        Me.Label4.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label4.Size = New System.Drawing.Size(44, 13)
        Me.Label4.TabIndex = 16
        Me.Label4.Text = "الحساب"
        '
        'CombBank
        '
        Me.CombBank.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.CombBank.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombBank.FormattingEnabled = True
        Me.CombBank.Location = New System.Drawing.Point(222, 21)
        Me.CombBank.Name = "CombBank"
        Me.CombBank.Size = New System.Drawing.Size(208, 21)
        Me.CombBank.TabIndex = 3
        '
        'txtChNo
        '
        Me.txtChNo.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtChNo.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtChNo.Location = New System.Drawing.Point(486, 22)
        Me.txtChNo.Name = "txtChNo"
        Me.txtChNo.Size = New System.Drawing.Size(126, 20)
        Me.txtChNo.TabIndex = 2
        Me.txtChNo.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'RBank
        '
        Me.RBank.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.RBank.AutoSize = True
        Me.RBank.Location = New System.Drawing.Point(618, 22)
        Me.RBank.Name = "RBank"
        Me.RBank.Size = New System.Drawing.Size(73, 17)
        Me.RBank.TabIndex = 1
        Me.RBank.TabStop = True
        Me.RBank.Text = "بشيك رقم"
        Me.RBank.UseVisualStyleBackColor = True
        '
        'RCash
        '
        Me.RCash.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.RCash.AutoSize = True
        Me.RCash.Location = New System.Drawing.Point(697, 22)
        Me.RCash.Name = "RCash"
        Me.RCash.Size = New System.Drawing.Size(43, 17)
        Me.RCash.TabIndex = 0
        Me.RCash.TabStop = True
        Me.RCash.Text = "نقدا"
        Me.RCash.UseVisualStyleBackColor = True
        '
        'ErrProv
        '
        Me.ErrProv.ContainerControl = Me
        '
        'Label6
        '
        Me.Label6.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left), System.Windows.Forms.AnchorStyles)
        Me.Label6.AutoSize = True
        Me.Label6.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label6.Location = New System.Drawing.Point(269, 450)
        Me.Label6.Name = "Label6"
        Me.Label6.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label6.Size = New System.Drawing.Size(41, 13)
        Me.Label6.TabIndex = 126
        Me.Label6.Text = "التاريخ"
        '
        'DTPTrans
        '
        Me.DTPTrans.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left), System.Windows.Forms.AnchorStyles)
        Me.DTPTrans.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.DTPTrans.Location = New System.Drawing.Point(316, 446)
        Me.DTPTrans.Name = "DTPTrans"
        Me.DTPTrans.RightToLeftLayout = True
        Me.DTPTrans.Size = New System.Drawing.Size(212, 21)
        Me.DTPTrans.TabIndex = 7
        '
        'TreeAcc
        '
        Me.TreeAcc.Dock = System.Windows.Forms.DockStyle.Left
        Me.TreeAcc.Font = New System.Drawing.Font("Times New Roman", 12.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.TreeAcc.Location = New System.Drawing.Point(0, 0)
        Me.TreeAcc.Name = "TreeAcc"
        Me.TreeAcc.RightToLeftLayout = True
        Me.TreeAcc.Size = New System.Drawing.Size(261, 486)
        Me.TreeAcc.TabIndex = 128
        '
        'Package
        '
        DataGridViewCellStyle2.WrapMode = System.Windows.Forms.DataGridViewTriState.[True]
        Me.Package.DefaultCellStyle = DataGridViewCellStyle2
        Me.Package.FillWeight = 406.0914!
        Me.Package.HeaderText = "الحساب"
        Me.Package.Name = "Package"
        Me.Package.ReadOnly = True
        '
        'Acc
        '
        DataGridViewCellStyle3.WrapMode = System.Windows.Forms.DataGridViewTriState.[True]
        Me.Acc.DefaultCellStyle = DataGridViewCellStyle3
        Me.Acc.FillWeight = 56.27266!
        Me.Acc.HeaderText = "=>"
        Me.Acc.Name = "Acc"
        Me.Acc.ReadOnly = True
        '
        'Column3
        '
        DataGridViewCellStyle4.WrapMode = System.Windows.Forms.DataGridViewTriState.[True]
        Me.Column3.DefaultCellStyle = DataGridViewCellStyle4
        Me.Column3.FillWeight = 56.27266!
        Me.Column3.HeaderText = "=>"
        Me.Column3.Name = "Column3"
        Me.Column3.ReadOnly = True
        '
        'Column4
        '
        DataGridViewCellStyle5.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        DataGridViewCellStyle5.WrapMode = System.Windows.Forms.DataGridViewTriState.[True]
        Me.Column4.DefaultCellStyle = DataGridViewCellStyle5
        Me.Column4.FillWeight = 56.27266!
        Me.Column4.HeaderText = "=>"
        Me.Column4.Name = "Column4"
        Me.Column4.ReadOnly = True
        '
        'Column1
        '
        Me.Column1.HeaderText = "=>"
        Me.Column1.Name = "Column1"
        Me.Column1.ReadOnly = True
        Me.Column1.Width = 150
        '
        'Column5
        '
        Me.Column5.HeaderText = "القسم"
        Me.Column5.Name = "Column5"
        Me.Column5.ReadOnly = True
        '
        'Credit
        '
        DataGridViewCellStyle6.Alignment = System.Windows.Forms.DataGridViewContentAlignment.MiddleLeft
        DataGridViewCellStyle6.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        DataGridViewCellStyle6.Format = "N2"
        DataGridViewCellStyle6.NullValue = "0"
        Me.Credit.DefaultCellStyle = DataGridViewCellStyle6
        Me.Credit.FillWeight = 56.27266!
        Me.Credit.HeaderText = "الرصيد"
        Me.Credit.Name = "Credit"
        Me.Credit.ReadOnly = True
        Me.Credit.Width = 80
        '
        'Column2
        '
        Me.Column2.HeaderText = "حذف"
        Me.Column2.Name = "Column2"
        Me.Column2.ReadOnly = True
        Me.Column2.Width = 75
        '
        'frmMakePayBill
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(1020, 486)
        Me.Controls.Add(Me.TreeAcc)
        Me.Controls.Add(Me.Label6)
        Me.Controls.Add(Me.DTPTrans)
        Me.Controls.Add(Me.GroupBox5)
        Me.Controls.Add(Me.GridVouchers)
        Me.Controls.Add(Me.GroupBox3)
        Me.Controls.Add(Me.GroupBox4)
        Me.Controls.Add(Me.GroupBox2)
        Me.Controls.Add(Me.GroupBox7)
        Me.Controls.Add(Me.Button1)
        Me.Controls.Add(Me.btnGClose)
        Me.Controls.Add(Me.btnGSave)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MinimumSize = New System.Drawing.Size(996, 524)
        Me.Name = "frmMakePayBill"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.RightToLeftLayout = True
        Me.SizeGripStyle = System.Windows.Forms.SizeGripStyle.Hide
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "سند دفع"
        Me.WindowState = System.Windows.Forms.FormWindowState.Maximized
        Me.GroupBox5.ResumeLayout(False)
        Me.GroupBox5.PerformLayout()
        CType(Me.GridVouchers, System.ComponentModel.ISupportInitialize).EndInit()
        Me.GroupBox3.ResumeLayout(False)
        Me.GroupBox3.PerformLayout()
        Me.GroupBox4.ResumeLayout(False)
        Me.GroupBox4.PerformLayout()
        Me.GroupBox7.ResumeLayout(False)
        Me.GroupBox7.PerformLayout()
        CType(Me.ErrProv, System.ComponentModel.ISupportInitialize).EndInit()
        Me.ResumeLayout(False)
        Me.PerformLayout()

    End Sub
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents btnGClose As System.Windows.Forms.Button
    Friend WithEvents btnGSave As System.Windows.Forms.Button
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents DTPCheq As System.Windows.Forms.DateTimePicker
    Friend WithEvents GroupBox5 As System.Windows.Forms.GroupBox
    Friend WithEvents txtDescr As System.Windows.Forms.TextBox
    Friend WithEvents GridVouchers As System.Windows.Forms.DataGridView
    Friend WithEvents GroupBox3 As System.Windows.Forms.GroupBox
    Friend WithEvents Button2 As System.Windows.Forms.Button
    Friend WithEvents txtAcc4 As System.Windows.Forms.TextBox
    Friend WithEvents Label5 As System.Windows.Forms.Label
    Friend WithEvents txtAcc3 As System.Windows.Forms.TextBox
    Friend WithEvents txtAmount As System.Windows.Forms.TextBox
    Friend WithEvents txtAcc2 As System.Windows.Forms.TextBox
    Friend WithEvents txtAcc1 As System.Windows.Forms.TextBox
    Friend WithEvents GroupBox4 As System.Windows.Forms.GroupBox
    Friend WithEvents Label3 As System.Windows.Forms.Label
    Friend WithEvents txtWrittenValue As System.Windows.Forms.TextBox
    Friend WithEvents Label2 As System.Windows.Forms.Label
    Friend WithEvents txtTotalAmount As System.Windows.Forms.TextBox
    Friend WithEvents txtSource As System.Windows.Forms.TextBox
    Friend WithEvents GroupBox2 As System.Windows.Forms.GroupBox
    Friend WithEvents GroupBox7 As System.Windows.Forms.GroupBox
    Friend WithEvents Label4 As System.Windows.Forms.Label
    Friend WithEvents CombBank As System.Windows.Forms.ComboBox
    Friend WithEvents txtChNo As System.Windows.Forms.TextBox
    Friend WithEvents RBank As System.Windows.Forms.RadioButton
    Friend WithEvents RCash As System.Windows.Forms.RadioButton
    Friend WithEvents ErrProv As System.Windows.Forms.ErrorProvider
    Friend WithEvents Button3 As System.Windows.Forms.Button
    Friend WithEvents Label6 As System.Windows.Forms.Label
    Friend WithEvents DTPTrans As System.Windows.Forms.DateTimePicker
    Friend WithEvents ROther As System.Windows.Forms.RadioButton
    Friend WithEvents btnSearch As System.Windows.Forms.Button
    Friend WithEvents txtAc4 As System.Windows.Forms.TextBox
    Friend WithEvents txtAc3 As System.Windows.Forms.TextBox
    Friend WithEvents txtAc2 As System.Windows.Forms.TextBox
    Friend WithEvents txtAc1 As System.Windows.Forms.TextBox
    Friend WithEvents ComboDepart As System.Windows.Forms.ComboBox
    Friend WithEvents Label7 As System.Windows.Forms.Label
    Friend WithEvents Label8 As System.Windows.Forms.Label
    Friend WithEvents Label9 As System.Windows.Forms.Label
    Friend WithEvents txtAcc5 As System.Windows.Forms.TextBox
    Friend WithEvents Label10 As System.Windows.Forms.Label
    Friend WithEvents txtAc5 As System.Windows.Forms.TextBox
    Friend WithEvents TreeAcc As System.Windows.Forms.TreeView
    Friend WithEvents Package As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Acc As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column3 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column4 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column1 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column5 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Credit As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column2 As System.Windows.Forms.DataGridViewButtonColumn
End Class
