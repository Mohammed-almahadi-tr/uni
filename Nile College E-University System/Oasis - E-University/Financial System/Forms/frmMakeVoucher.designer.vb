<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frmMakeVoucher
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
        Dim DataGridViewCellStyle7 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim DataGridViewCellStyle8 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmMakeVoucher))
        Me.txtAmount = New System.Windows.Forms.TextBox()
        Me.txtDescr = New System.Windows.Forms.TextBox()
        Me.Label4 = New System.Windows.Forms.Label()
        Me.Label3 = New System.Windows.Forms.Label()
        Me.combChType = New System.Windows.Forms.ComboBox()
        Me.Label2 = New System.Windows.Forms.Label()
        Me.GroupBox1 = New System.Windows.Forms.GroupBox()
        Me.ComboDepart = New System.Windows.Forms.ComboBox()
        Me.Label6 = New System.Windows.Forms.Label()
        Me.Button2 = New System.Windows.Forms.Button()
        Me.GridVouchers = New System.Windows.Forms.DataGridView()
        Me.Package = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Acc = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column3 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column4 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column7 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column5 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column6 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column8 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column1 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Depit = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Credit = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column2 = New System.Windows.Forms.DataGridViewButtonColumn()
        Me.txtDep = New System.Windows.Forms.TextBox()
        Me.txtCrd = New System.Windows.Forms.TextBox()
        Me.txtBalance = New System.Windows.Forms.TextBox()
        Me.Label5 = New System.Windows.Forms.Label()
        Me.Label8 = New System.Windows.Forms.Label()
        Me.Label9 = New System.Windows.Forms.Label()
        Me.btnSave = New System.Windows.Forms.Button()
        Me.btnClose = New System.Windows.Forms.Button()
        Me.GroupBox3 = New System.Windows.Forms.GroupBox()
        Me.GroupBox6 = New System.Windows.Forms.GroupBox()
        Me.TreeAcc = New System.Windows.Forms.TreeView()
        Me.Button1 = New System.Windows.Forms.Button()
        Me.ErrProv = New System.Windows.Forms.ErrorProvider(Me.components)
        Me.GroupBox2 = New System.Windows.Forms.GroupBox()
        Me.txtAcc5 = New System.Windows.Forms.TextBox()
        Me.RadioButton1 = New System.Windows.Forms.RadioButton()
        Me.Button3 = New System.Windows.Forms.Button()
        Me.txtAcc4 = New System.Windows.Forms.TextBox()
        Me.txtAcc3 = New System.Windows.Forms.TextBox()
        Me.txtAcc2 = New System.Windows.Forms.TextBox()
        Me.txtAcc1 = New System.Windows.Forms.TextBox()
        Me.Label1 = New System.Windows.Forms.Label()
        Me.DTPTrans = New System.Windows.Forms.DateTimePicker()
        Me.GroupBox4 = New System.Windows.Forms.GroupBox()
        Me.RadioButton2 = New System.Windows.Forms.RadioButton()
        Me.Button4 = New System.Windows.Forms.Button()
        Me.txtStdName = New System.Windows.Forms.TextBox()
        Me.txtStdIndex = New System.Windows.Forms.TextBox()
        Me.Button5 = New System.Windows.Forms.Button()
        Me.GroupBox1.SuspendLayout()
        CType(Me.GridVouchers, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.GroupBox3.SuspendLayout()
        CType(Me.ErrProv, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.GroupBox2.SuspendLayout()
        Me.GroupBox4.SuspendLayout()
        Me.SuspendLayout()
        '
        'txtAmount
        '
        Me.txtAmount.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAmount.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtAmount.Location = New System.Drawing.Point(428, 13)
        Me.txtAmount.Name = "txtAmount"
        Me.txtAmount.Size = New System.Drawing.Size(103, 21)
        Me.txtAmount.TabIndex = 1
        Me.txtAmount.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'txtDescr
        '
        Me.txtDescr.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtDescr.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtDescr.Location = New System.Drawing.Point(116, 41)
        Me.txtDescr.Name = "txtDescr"
        Me.txtDescr.Size = New System.Drawing.Size(535, 21)
        Me.txtDescr.TabIndex = 2
        '
        'Label4
        '
        Me.Label4.AutoSize = True
        Me.Label4.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label4.Location = New System.Drawing.Point(659, 46)
        Me.Label4.Name = "Label4"
        Me.Label4.Size = New System.Drawing.Size(47, 13)
        Me.Label4.TabIndex = 30
        Me.Label4.Text = "«· ›«’Ì·"
        Me.Label4.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label3
        '
        Me.Label3.AutoSize = True
        Me.Label3.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label3.Location = New System.Drawing.Point(537, 15)
        Me.Label3.Name = "Label3"
        Me.Label3.Size = New System.Drawing.Size(37, 13)
        Me.Label3.TabIndex = 27
        Me.Label3.Text = "«·—’Ìœ"
        Me.Label3.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'combChType
        '
        Me.combChType.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.combChType.DropDownWidth = 73
        Me.combChType.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.combChType.Items.AddRange(New Object() {"„œÌ‰", "œ«∆‰"})
        Me.combChType.Location = New System.Drawing.Point(578, 12)
        Me.combChType.Name = "combChType"
        Me.combChType.Size = New System.Drawing.Size(73, 21)
        Me.combChType.TabIndex = 0
        '
        'Label2
        '
        Me.Label2.AutoSize = True
        Me.Label2.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label2.Location = New System.Drawing.Point(659, 13)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(29, 13)
        Me.Label2.TabIndex = 25
        Me.Label2.Text = "«·‰Ê⁄"
        Me.Label2.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'GroupBox1
        '
        Me.GroupBox1.Anchor = CType(((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox1.Controls.Add(Me.ComboDepart)
        Me.GroupBox1.Controls.Add(Me.Label6)
        Me.GroupBox1.Controls.Add(Me.txtAmount)
        Me.GroupBox1.Controls.Add(Me.Label4)
        Me.GroupBox1.Controls.Add(Me.Label3)
        Me.GroupBox1.Controls.Add(Me.txtDescr)
        Me.GroupBox1.Controls.Add(Me.Label2)
        Me.GroupBox1.Controls.Add(Me.Button2)
        Me.GroupBox1.Controls.Add(Me.combChType)
        Me.GroupBox1.Location = New System.Drawing.Point(238, 111)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(781, 80)
        Me.GroupBox1.TabIndex = 1
        Me.GroupBox1.TabStop = False
        Me.GroupBox1.Text = " ›«’Ì· «·⁄„·Ì…"
        '
        'ComboDepart
        '
        Me.ComboDepart.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.ComboDepart.FormattingEnabled = True
        Me.ComboDepart.Items.AddRange(New Object() {"«·Œœ„« ", "«·⁄·«ﬁ«  «·Œ«—ÃÌ…", "‘ƒ‰ «·«›—«œ", "„—ﬂ“  ﬁ‰Ì… «·„⁄·Ê„« "})
        Me.ComboDepart.Location = New System.Drawing.Point(210, 12)
        Me.ComboDepart.Name = "ComboDepart"
        Me.ComboDepart.Size = New System.Drawing.Size(167, 21)
        Me.ComboDepart.TabIndex = 32
        '
        'Label6
        '
        Me.Label6.AutoSize = True
        Me.Label6.Location = New System.Drawing.Point(383, 16)
        Me.Label6.Name = "Label6"
        Me.Label6.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label6.Size = New System.Drawing.Size(39, 13)
        Me.Label6.TabIndex = 31
        Me.Label6.Text = "«·ﬁ”„"
        '
        'Button2
        '
        Me.Button2.Location = New System.Drawing.Point(40, 41)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(72, 23)
        Me.Button2.TabIndex = 2
        Me.Button2.Text = "«÷«›…"
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
        Me.GridVouchers.Columns.AddRange(New System.Windows.Forms.DataGridViewColumn() {Me.Package, Me.Acc, Me.Column3, Me.Column4, Me.Column7, Me.Column5, Me.Column6, Me.Column8, Me.Column1, Me.Depit, Me.Credit, Me.Column2})
        Me.GridVouchers.Location = New System.Drawing.Point(238, 210)
        Me.GridVouchers.Name = "GridVouchers"
        Me.GridVouchers.ReadOnly = True
        Me.GridVouchers.Size = New System.Drawing.Size(781, 180)
        Me.GridVouchers.TabIndex = 3
        '
        'Package
        '
        DataGridViewCellStyle2.WrapMode = System.Windows.Forms.DataGridViewTriState.[True]
        Me.Package.DefaultCellStyle = DataGridViewCellStyle2
        Me.Package.FillWeight = 406.0914!
        Me.Package.HeaderText = "«·Õ”«»"
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
        'Column7
        '
        Me.Column7.HeaderText = "=>"
        Me.Column7.Name = "Column7"
        Me.Column7.ReadOnly = True
        '
        'Column5
        '
        Me.Column5.HeaderText = "—ﬁ„ «·ÿ«·»"
        Me.Column5.Name = "Column5"
        Me.Column5.ReadOnly = True
        Me.Column5.Width = 80
        '
        'Column6
        '
        Me.Column6.HeaderText = "«”„ «·ÿ«·»"
        Me.Column6.Name = "Column6"
        Me.Column6.ReadOnly = True
        '
        'Column8
        '
        Me.Column8.HeaderText = "«·ﬁ”„"
        Me.Column8.Name = "Column8"
        Me.Column8.ReadOnly = True
        '
        'Column1
        '
        DataGridViewCellStyle6.WrapMode = System.Windows.Forms.DataGridViewTriState.[True]
        Me.Column1.DefaultCellStyle = DataGridViewCellStyle6
        Me.Column1.FillWeight = 56.27266!
        Me.Column1.HeaderText = "«· ›«’Ì·"
        Me.Column1.Name = "Column1"
        Me.Column1.ReadOnly = True
        Me.Column1.Width = 150
        '
        'Depit
        '
        DataGridViewCellStyle7.Alignment = System.Windows.Forms.DataGridViewContentAlignment.MiddleLeft
        DataGridViewCellStyle7.Format = "N2"
        DataGridViewCellStyle7.NullValue = "0"
        Me.Depit.DefaultCellStyle = DataGridViewCellStyle7
        Me.Depit.FillWeight = 56.27266!
        Me.Depit.HeaderText = "„œÌ‰"
        Me.Depit.Name = "Depit"
        Me.Depit.ReadOnly = True
        Me.Depit.Width = 80
        '
        'Credit
        '
        DataGridViewCellStyle8.Alignment = System.Windows.Forms.DataGridViewContentAlignment.MiddleLeft
        DataGridViewCellStyle8.Format = "N2"
        DataGridViewCellStyle8.NullValue = "0"
        Me.Credit.DefaultCellStyle = DataGridViewCellStyle8
        Me.Credit.FillWeight = 56.27266!
        Me.Credit.HeaderText = "œ«∆‰"
        Me.Credit.Name = "Credit"
        Me.Credit.ReadOnly = True
        Me.Credit.Width = 80
        '
        'Column2
        '
        Me.Column2.HeaderText = "Õ–›"
        Me.Column2.Name = "Column2"
        Me.Column2.ReadOnly = True
        Me.Column2.Width = 75
        '
        'txtDep
        '
        Me.txtDep.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtDep.BackColor = System.Drawing.Color.Black
        Me.txtDep.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtDep.Font = New System.Drawing.Font("Tahoma", 9.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtDep.ForeColor = System.Drawing.Color.GreenYellow
        Me.txtDep.Location = New System.Drawing.Point(594, 15)
        Me.txtDep.Name = "txtDep"
        Me.txtDep.ReadOnly = True
        Me.txtDep.Size = New System.Drawing.Size(122, 23)
        Me.txtDep.TabIndex = 42
        Me.txtDep.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'txtCrd
        '
        Me.txtCrd.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtCrd.BackColor = System.Drawing.Color.Black
        Me.txtCrd.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtCrd.Font = New System.Drawing.Font("Tahoma", 9.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtCrd.ForeColor = System.Drawing.Color.GreenYellow
        Me.txtCrd.Location = New System.Drawing.Point(396, 15)
        Me.txtCrd.Name = "txtCrd"
        Me.txtCrd.ReadOnly = True
        Me.txtCrd.Size = New System.Drawing.Size(122, 23)
        Me.txtCrd.TabIndex = 43
        Me.txtCrd.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'txtBalance
        '
        Me.txtBalance.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtBalance.BackColor = System.Drawing.Color.Black
        Me.txtBalance.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtBalance.Font = New System.Drawing.Font("Tahoma", 9.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtBalance.ForeColor = System.Drawing.Color.GreenYellow
        Me.txtBalance.Location = New System.Drawing.Point(186, 15)
        Me.txtBalance.Name = "txtBalance"
        Me.txtBalance.ReadOnly = True
        Me.txtBalance.Size = New System.Drawing.Size(122, 23)
        Me.txtBalance.TabIndex = 43
        Me.txtBalance.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label5
        '
        Me.Label5.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label5.AutoSize = True
        Me.Label5.Font = New System.Drawing.Font("Tahoma", 9.75!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label5.Location = New System.Drawing.Point(524, 17)
        Me.Label5.Name = "Label5"
        Me.Label5.Size = New System.Drawing.Size(31, 16)
        Me.Label5.TabIndex = 92
        Me.Label5.Text = "œ«∆‰"
        Me.Label5.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label8
        '
        Me.Label8.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label8.AutoSize = True
        Me.Label8.Font = New System.Drawing.Font("Tahoma", 9.75!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label8.Location = New System.Drawing.Point(722, 17)
        Me.Label8.Name = "Label8"
        Me.Label8.Size = New System.Drawing.Size(36, 16)
        Me.Label8.TabIndex = 93
        Me.Label8.Text = "„œÌ‰"
        Me.Label8.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label9
        '
        Me.Label9.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label9.AutoSize = True
        Me.Label9.Font = New System.Drawing.Font("Tahoma", 9.75!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label9.Location = New System.Drawing.Point(311, 17)
        Me.Label9.Name = "Label9"
        Me.Label9.Size = New System.Drawing.Size(53, 16)
        Me.Label9.TabIndex = 94
        Me.Label9.Text = "«·„ »ﬁÌ"
        Me.Label9.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'btnSave
        '
        Me.btnSave.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.btnSave.Location = New System.Drawing.Point(857, 457)
        Me.btnSave.Name = "btnSave"
        Me.btnSave.Size = New System.Drawing.Size(75, 32)
        Me.btnSave.TabIndex = 4
        Me.btnSave.Text = "Õ›Ÿ"
        '
        'btnClose
        '
        Me.btnClose.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.btnClose.DialogResult = System.Windows.Forms.DialogResult.Cancel
        Me.btnClose.Location = New System.Drawing.Point(1192, 458)
        Me.btnClose.Name = "btnClose"
        Me.btnClose.Size = New System.Drawing.Size(75, 32)
        Me.btnClose.TabIndex = 5
        Me.btnClose.Text = "«€·«ﬁ"
        '
        'GroupBox3
        '
        Me.GroupBox3.Anchor = CType(((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox3.Controls.Add(Me.txtCrd)
        Me.GroupBox3.Controls.Add(Me.Label5)
        Me.GroupBox3.Controls.Add(Me.txtDep)
        Me.GroupBox3.Controls.Add(Me.Label9)
        Me.GroupBox3.Controls.Add(Me.Label8)
        Me.GroupBox3.Controls.Add(Me.txtBalance)
        Me.GroupBox3.Location = New System.Drawing.Point(238, 396)
        Me.GroupBox3.Name = "GroupBox3"
        Me.GroupBox3.Size = New System.Drawing.Size(781, 47)
        Me.GroupBox3.TabIndex = 97
        Me.GroupBox3.TabStop = False
        '
        'GroupBox6
        '
        Me.GroupBox6.Anchor = CType(((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox6.Location = New System.Drawing.Point(238, 449)
        Me.GroupBox6.Name = "GroupBox6"
        Me.GroupBox6.Size = New System.Drawing.Size(781, 10)
        Me.GroupBox6.TabIndex = 98
        Me.GroupBox6.TabStop = False
        '
        'TreeAcc
        '
        Me.TreeAcc.Dock = System.Windows.Forms.DockStyle.Left
        Me.TreeAcc.Font = New System.Drawing.Font("Times New Roman", 12.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.TreeAcc.Location = New System.Drawing.Point(0, 0)
        Me.TreeAcc.Name = "TreeAcc"
        Me.TreeAcc.RightToLeftLayout = True
        Me.TreeAcc.Size = New System.Drawing.Size(232, 494)
        Me.TreeAcc.TabIndex = 121
        '
        'Button1
        '
        Me.Button1.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Button1.Location = New System.Drawing.Point(1079, 458)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 32)
        Me.Button1.TabIndex = 122
        Me.Button1.Text = "„”Õ"
        '
        'ErrProv
        '
        Me.ErrProv.ContainerControl = Me
        '
        'GroupBox2
        '
        Me.GroupBox2.Anchor = CType(((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox2.Controls.Add(Me.txtAcc5)
        Me.GroupBox2.Controls.Add(Me.RadioButton1)
        Me.GroupBox2.Controls.Add(Me.Button3)
        Me.GroupBox2.Controls.Add(Me.txtAcc4)
        Me.GroupBox2.Controls.Add(Me.txtAcc3)
        Me.GroupBox2.Controls.Add(Me.txtAcc2)
        Me.GroupBox2.Controls.Add(Me.txtAcc1)
        Me.GroupBox2.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.GroupBox2.Location = New System.Drawing.Point(238, 12)
        Me.GroupBox2.Name = "GroupBox2"
        Me.GroupBox2.Size = New System.Drawing.Size(781, 48)
        Me.GroupBox2.TabIndex = 123
        Me.GroupBox2.TabStop = False
        Me.GroupBox2.Text = "Õ”«»"
        '
        'txtAcc5
        '
        Me.txtAcc5.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtAcc5.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAcc5.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtAcc5.Location = New System.Drawing.Point(75, 15)
        Me.txtAcc5.Name = "txtAcc5"
        Me.txtAcc5.ReadOnly = True
        Me.txtAcc5.Size = New System.Drawing.Size(111, 21)
        Me.txtAcc5.TabIndex = 127
        '
        'RadioButton1
        '
        Me.RadioButton1.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.RadioButton1.AutoSize = True
        Me.RadioButton1.Location = New System.Drawing.Point(663, 17)
        Me.RadioButton1.Name = "RadioButton1"
        Me.RadioButton1.Size = New System.Drawing.Size(97, 17)
        Me.RadioButton1.TabIndex = 126
        Me.RadioButton1.TabStop = True
        Me.RadioButton1.Text = "Õ”«»«  «·«Œ—Ì"
        Me.RadioButton1.UseVisualStyleBackColor = True
        '
        'Button3
        '
        Me.Button3.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Button3.Location = New System.Drawing.Point(12, 12)
        Me.Button3.Name = "Button3"
        Me.Button3.Size = New System.Drawing.Size(60, 23)
        Me.Button3.TabIndex = 4
        Me.Button3.Text = "«Œ Ì«—..."
        '
        'txtAcc4
        '
        Me.txtAcc4.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtAcc4.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAcc4.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtAcc4.Location = New System.Drawing.Point(192, 15)
        Me.txtAcc4.Name = "txtAcc4"
        Me.txtAcc4.ReadOnly = True
        Me.txtAcc4.Size = New System.Drawing.Size(111, 21)
        Me.txtAcc4.TabIndex = 3
        '
        'txtAcc3
        '
        Me.txtAcc3.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtAcc3.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAcc3.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtAcc3.Location = New System.Drawing.Point(309, 15)
        Me.txtAcc3.Name = "txtAcc3"
        Me.txtAcc3.ReadOnly = True
        Me.txtAcc3.Size = New System.Drawing.Size(111, 21)
        Me.txtAcc3.TabIndex = 2
        '
        'txtAcc2
        '
        Me.txtAcc2.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtAcc2.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAcc2.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtAcc2.Location = New System.Drawing.Point(426, 15)
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
        Me.txtAcc1.Location = New System.Drawing.Point(543, 15)
        Me.txtAcc1.Name = "txtAcc1"
        Me.txtAcc1.ReadOnly = True
        Me.txtAcc1.Size = New System.Drawing.Size(111, 21)
        Me.txtAcc1.TabIndex = 0
        '
        'Label1
        '
        Me.Label1.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left), System.Windows.Forms.AnchorStyles)
        Me.Label1.AutoSize = True
        Me.Label1.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label1.Location = New System.Drawing.Point(238, 464)
        Me.Label1.Name = "Label1"
        Me.Label1.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label1.Size = New System.Drawing.Size(41, 13)
        Me.Label1.TabIndex = 124
        Me.Label1.Text = "«· «—ÌŒ"
        '
        'DTPTrans
        '
        Me.DTPTrans.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left), System.Windows.Forms.AnchorStyles)
        Me.DTPTrans.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.DTPTrans.Location = New System.Drawing.Point(285, 461)
        Me.DTPTrans.Name = "DTPTrans"
        Me.DTPTrans.RightToLeftLayout = True
        Me.DTPTrans.Size = New System.Drawing.Size(247, 21)
        Me.DTPTrans.TabIndex = 125
        '
        'GroupBox4
        '
        Me.GroupBox4.Anchor = CType(((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox4.Controls.Add(Me.RadioButton2)
        Me.GroupBox4.Controls.Add(Me.Button4)
        Me.GroupBox4.Controls.Add(Me.txtStdName)
        Me.GroupBox4.Controls.Add(Me.txtStdIndex)
        Me.GroupBox4.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.GroupBox4.Location = New System.Drawing.Point(238, 66)
        Me.GroupBox4.Name = "GroupBox4"
        Me.GroupBox4.Size = New System.Drawing.Size(781, 48)
        Me.GroupBox4.TabIndex = 127
        Me.GroupBox4.TabStop = False
        Me.GroupBox4.Text = "ÿ«·»"
        '
        'RadioButton2
        '
        Me.RadioButton2.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.RadioButton2.AutoSize = True
        Me.RadioButton2.Location = New System.Drawing.Point(670, 19)
        Me.RadioButton2.Name = "RadioButton2"
        Me.RadioButton2.Size = New System.Drawing.Size(90, 17)
        Me.RadioButton2.TabIndex = 126
        Me.RadioButton2.TabStop = True
        Me.RadioButton2.Text = "Õ”«» «·ÿ·«»"
        Me.RadioButton2.UseVisualStyleBackColor = True
        '
        'Button4
        '
        Me.Button4.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Button4.Location = New System.Drawing.Point(12, 16)
        Me.Button4.Name = "Button4"
        Me.Button4.Size = New System.Drawing.Size(60, 23)
        Me.Button4.TabIndex = 4
        Me.Button4.Text = "«Œ Ì«—..."
        '
        'txtStdName
        '
        Me.txtStdName.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtStdName.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtStdName.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtStdName.Location = New System.Drawing.Point(75, 16)
        Me.txtStdName.Name = "txtStdName"
        Me.txtStdName.ReadOnly = True
        Me.txtStdName.Size = New System.Drawing.Size(442, 21)
        Me.txtStdName.TabIndex = 1
        '
        'txtStdIndex
        '
        Me.txtStdIndex.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtStdIndex.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtStdIndex.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtStdIndex.Location = New System.Drawing.Point(523, 16)
        Me.txtStdIndex.Name = "txtStdIndex"
        Me.txtStdIndex.Size = New System.Drawing.Size(131, 21)
        Me.txtStdIndex.TabIndex = 0
        '
        'Button5
        '
        Me.Button5.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Button5.Location = New System.Drawing.Point(938, 457)
        Me.Button5.Name = "Button5"
        Me.Button5.Size = New System.Drawing.Size(75, 32)
        Me.Button5.TabIndex = 128
        Me.Button5.Text = "«€·«ﬁ"
        '
        'frmMakeVoucher
        '
        Me.AcceptButton = Me.btnSave
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.CancelButton = Me.btnClose
        Me.ClientSize = New System.Drawing.Size(1020, 494)
        Me.Controls.Add(Me.Button5)
        Me.Controls.Add(Me.GroupBox4)
        Me.Controls.Add(Me.Label1)
        Me.Controls.Add(Me.DTPTrans)
        Me.Controls.Add(Me.GroupBox2)
        Me.Controls.Add(Me.Button1)
        Me.Controls.Add(Me.TreeAcc)
        Me.Controls.Add(Me.GroupBox6)
        Me.Controls.Add(Me.GroupBox3)
        Me.Controls.Add(Me.btnClose)
        Me.Controls.Add(Me.btnSave)
        Me.Controls.Add(Me.GridVouchers)
        Me.Controls.Add(Me.GroupBox1)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MinimumSize = New System.Drawing.Size(1000, 487)
        Me.Name = "frmMakeVoucher"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.RightToLeftLayout = True
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "ﬁÌœ «·ÌÊ„Ì…"
        Me.WindowState = System.Windows.Forms.FormWindowState.Maximized
        Me.GroupBox1.ResumeLayout(False)
        Me.GroupBox1.PerformLayout()
        CType(Me.GridVouchers, System.ComponentModel.ISupportInitialize).EndInit()
        Me.GroupBox3.ResumeLayout(False)
        Me.GroupBox3.PerformLayout()
        CType(Me.ErrProv, System.ComponentModel.ISupportInitialize).EndInit()
        Me.GroupBox2.ResumeLayout(False)
        Me.GroupBox2.PerformLayout()
        Me.GroupBox4.ResumeLayout(False)
        Me.GroupBox4.PerformLayout()
        Me.ResumeLayout(False)
        Me.PerformLayout()

    End Sub
    Friend WithEvents txtAmount As System.Windows.Forms.TextBox
    Friend WithEvents txtDescr As System.Windows.Forms.TextBox
    Friend WithEvents Label4 As System.Windows.Forms.Label
    Friend WithEvents Label3 As System.Windows.Forms.Label
    Friend WithEvents combChType As System.Windows.Forms.ComboBox
    Friend WithEvents Label2 As System.Windows.Forms.Label
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents GridVouchers As System.Windows.Forms.DataGridView
    Friend WithEvents Button2 As System.Windows.Forms.Button
    Friend WithEvents txtDep As System.Windows.Forms.TextBox
    Friend WithEvents txtCrd As System.Windows.Forms.TextBox
    Friend WithEvents txtBalance As System.Windows.Forms.TextBox
    Friend WithEvents Label5 As System.Windows.Forms.Label
    Friend WithEvents Label8 As System.Windows.Forms.Label
    Friend WithEvents Label9 As System.Windows.Forms.Label
    Friend WithEvents btnSave As System.Windows.Forms.Button
    Friend WithEvents btnClose As System.Windows.Forms.Button
    Friend WithEvents GroupBox3 As System.Windows.Forms.GroupBox
    Friend WithEvents GroupBox6 As System.Windows.Forms.GroupBox
    Friend WithEvents TreeAcc As System.Windows.Forms.TreeView
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents ErrProv As System.Windows.Forms.ErrorProvider
    Friend WithEvents GroupBox2 As System.Windows.Forms.GroupBox
    Friend WithEvents Button3 As System.Windows.Forms.Button
    Friend WithEvents txtAcc4 As System.Windows.Forms.TextBox
    Friend WithEvents txtAcc3 As System.Windows.Forms.TextBox
    Friend WithEvents txtAcc2 As System.Windows.Forms.TextBox
    Friend WithEvents txtAcc1 As System.Windows.Forms.TextBox
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents DTPTrans As System.Windows.Forms.DateTimePicker
    Friend WithEvents GroupBox4 As System.Windows.Forms.GroupBox
    Friend WithEvents RadioButton2 As System.Windows.Forms.RadioButton
    Friend WithEvents Button4 As System.Windows.Forms.Button
    Friend WithEvents txtStdName As System.Windows.Forms.TextBox
    Friend WithEvents txtStdIndex As System.Windows.Forms.TextBox
    Friend WithEvents RadioButton1 As System.Windows.Forms.RadioButton
    Friend WithEvents txtAcc5 As System.Windows.Forms.TextBox
    Friend WithEvents ComboDepart As System.Windows.Forms.ComboBox
    Friend WithEvents Label6 As System.Windows.Forms.Label
    Friend WithEvents Package As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Acc As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column3 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column4 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column7 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column5 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column6 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column8 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column1 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Depit As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Credit As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column2 As System.Windows.Forms.DataGridViewButtonColumn
    Friend WithEvents Button5 As System.Windows.Forms.Button
End Class
