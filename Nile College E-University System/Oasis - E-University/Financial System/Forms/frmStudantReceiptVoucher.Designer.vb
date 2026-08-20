<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frmStudantReceiptVoucher
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
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmStudantReceiptVoucher))
        Me.GroupBox3 = New System.Windows.Forms.GroupBox()
        Me.Button2 = New System.Windows.Forms.Button()
        Me.Label9 = New System.Windows.Forms.Label()
        Me.txtBalance = New System.Windows.Forms.TextBox()
        Me.Label1 = New System.Windows.Forms.Label()
        Me.Button3 = New System.Windows.Forms.Button()
        Me.Label5 = New System.Windows.Forms.Label()
        Me.txtStdIndex = New System.Windows.Forms.TextBox()
        Me.txtStdName = New System.Windows.Forms.TextBox()
        Me.Label2 = New System.Windows.Forms.Label()
        Me.DTPTrans = New System.Windows.Forms.DateTimePicker()
        Me.GroupBox2 = New System.Windows.Forms.GroupBox()
        Me.Button1 = New System.Windows.Forms.Button()
        Me.btnClose = New System.Windows.Forms.Button()
        Me.btnGSave = New System.Windows.Forms.Button()
        Me.GridVouchers = New System.Windows.Forms.DataGridView()
        Me.Package = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Acc = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column3 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column4 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column1 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Credit = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.GroupBox4 = New System.Windows.Forms.GroupBox()
        Me.Label4 = New System.Windows.Forms.Label()
        Me.txtWrittenValue = New System.Windows.Forms.TextBox()
        Me.Label6 = New System.Windows.Forms.Label()
        Me.txtTotalAmount = New System.Windows.Forms.TextBox()
        Me.GroupBox7 = New System.Windows.Forms.GroupBox()
        Me.Label7 = New System.Windows.Forms.Label()
        Me.CombBank = New System.Windows.Forms.ComboBox()
        Me.txtChNo = New System.Windows.Forms.TextBox()
        Me.RBank = New System.Windows.Forms.RadioButton()
        Me.RCash = New System.Windows.Forms.RadioButton()
        Me.ErrProv = New System.Windows.Forms.ErrorProvider(Me.components)
        Me.txtReceiptNo = New System.Windows.Forms.TextBox()
        Me.Label3 = New System.Windows.Forms.Label()
        Me.btnShowReceipt = New System.Windows.Forms.Button()
        Me.GroupBox3.SuspendLayout()
        CType(Me.GridVouchers, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.GroupBox4.SuspendLayout()
        Me.GroupBox7.SuspendLayout()
        CType(Me.ErrProv, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.SuspendLayout()
        '
        'GroupBox3
        '
        Me.GroupBox3.Anchor = CType(((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox3.Controls.Add(Me.Button2)
        Me.GroupBox3.Controls.Add(Me.Label9)
        Me.GroupBox3.Controls.Add(Me.txtBalance)
        Me.GroupBox3.Controls.Add(Me.Label1)
        Me.GroupBox3.Controls.Add(Me.Button3)
        Me.GroupBox3.Controls.Add(Me.Label5)
        Me.GroupBox3.Controls.Add(Me.txtStdIndex)
        Me.GroupBox3.Controls.Add(Me.txtStdName)
        Me.GroupBox3.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.GroupBox3.Location = New System.Drawing.Point(9, 40)
        Me.GroupBox3.Name = "GroupBox3"
        Me.GroupBox3.Size = New System.Drawing.Size(924, 86)
        Me.GroupBox3.TabIndex = 2
        Me.GroupBox3.TabStop = False
        Me.GroupBox3.Text = "Student (Credit Side)"
        '
        'Button2
        '
        Me.Button2.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Button2.Location = New System.Drawing.Point(522, 20)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(125, 23)
        Me.Button2.TabIndex = 25
        Me.Button2.Text = "عرض كشف الحساب"
        Me.Button2.UseVisualStyleBackColor = True
        '
        'Label9
        '
        Me.Label9.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label9.AutoSize = True
        Me.Label9.Location = New System.Drawing.Point(503, 59)
        Me.Label9.Name = "Label9"
        Me.Label9.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label9.Size = New System.Drawing.Size(37, 13)
        Me.Label9.TabIndex = 24
        Me.Label9.Text = "الرصيد"
        '
        'txtBalance
        '
        Me.txtBalance.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtBalance.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtBalance.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtBalance.Location = New System.Drawing.Point(348, 57)
        Me.txtBalance.Name = "txtBalance"
        Me.txtBalance.ReadOnly = True
        Me.txtBalance.Size = New System.Drawing.Size(149, 21)
        Me.txtBalance.TabIndex = 23
        '
        'Label1
        '
        Me.Label1.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label1.AutoSize = True
        Me.Label1.Location = New System.Drawing.Point(848, 57)
        Me.Label1.Name = "Label1"
        Me.Label1.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label1.Size = New System.Drawing.Size(62, 13)
        Me.Label1.TabIndex = 20
        Me.Label1.Text = "اسم الطالب"
        '
        'Button3
        '
        Me.Button3.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Button3.Location = New System.Drawing.Point(653, 20)
        Me.Button3.Name = "Button3"
        Me.Button3.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Button3.Size = New System.Drawing.Size(77, 23)
        Me.Button3.TabIndex = 2
        Me.Button3.Text = "بحث..."
        '
        'Label5
        '
        Me.Label5.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label5.AutoSize = True
        Me.Label5.Location = New System.Drawing.Point(848, 22)
        Me.Label5.Name = "Label5"
        Me.Label5.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label5.Size = New System.Drawing.Size(57, 13)
        Me.Label5.TabIndex = 18
        Me.Label5.Text = "رقم الطالب"
        '
        'txtStdIndex
        '
        Me.txtStdIndex.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtStdIndex.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtStdIndex.Location = New System.Drawing.Point(736, 20)
        Me.txtStdIndex.Name = "txtStdIndex"
        Me.txtStdIndex.Size = New System.Drawing.Size(106, 21)
        Me.txtStdIndex.TabIndex = 0
        Me.txtStdIndex.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'txtStdName
        '
        Me.txtStdName.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtStdName.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtStdName.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtStdName.Location = New System.Drawing.Point(546, 55)
        Me.txtStdName.Name = "txtStdName"
        Me.txtStdName.ReadOnly = True
        Me.txtStdName.Size = New System.Drawing.Size(296, 21)
        Me.txtStdName.TabIndex = 1
        '
        'Label2
        '
        Me.Label2.Anchor = System.Windows.Forms.AnchorStyles.Bottom
        Me.Label2.AutoSize = True
        Me.Label2.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label2.Location = New System.Drawing.Point(10, 515)
        Me.Label2.Name = "Label2"
        Me.Label2.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label2.Size = New System.Drawing.Size(41, 13)
        Me.Label2.TabIndex = 123
        Me.Label2.Text = "التاريخ"
        '
        'DTPTrans
        '
        Me.DTPTrans.Anchor = System.Windows.Forms.AnchorStyles.Bottom
        Me.DTPTrans.CustomFormat = "dd/MM/yyyy"
        Me.DTPTrans.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.DTPTrans.Format = System.Windows.Forms.DateTimePickerFormat.Custom
        Me.DTPTrans.Location = New System.Drawing.Point(54, 511)
        Me.DTPTrans.Name = "DTPTrans"
        Me.DTPTrans.RightToLeftLayout = True
        Me.DTPTrans.Size = New System.Drawing.Size(212, 21)
        Me.DTPTrans.TabIndex = 6
        '
        'GroupBox2
        '
        Me.GroupBox2.Anchor = CType(((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox2.Location = New System.Drawing.Point(9, 501)
        Me.GroupBox2.Name = "GroupBox2"
        Me.GroupBox2.Size = New System.Drawing.Size(924, 4)
        Me.GroupBox2.TabIndex = 124
        Me.GroupBox2.TabStop = False
        '
        'Button1
        '
        Me.Button1.Anchor = System.Windows.Forms.AnchorStyles.Bottom
        Me.Button1.Location = New System.Drawing.Point(752, 511)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 32)
        Me.Button1.TabIndex = 8
        Me.Button1.Text = "مسح"
        '
        'btnClose
        '
        Me.btnClose.Anchor = System.Windows.Forms.AnchorStyles.Bottom
        Me.btnClose.Location = New System.Drawing.Point(857, 511)
        Me.btnClose.Name = "btnClose"
        Me.btnClose.Size = New System.Drawing.Size(75, 32)
        Me.btnClose.TabIndex = 9
        Me.btnClose.Text = "اغلاق"
        '
        'btnGSave
        '
        Me.btnGSave.Anchor = System.Windows.Forms.AnchorStyles.Bottom
        Me.btnGSave.Location = New System.Drawing.Point(647, 511)
        Me.btnGSave.Name = "btnGSave"
        Me.btnGSave.Size = New System.Drawing.Size(75, 32)
        Me.btnGSave.TabIndex = 7
        Me.btnGSave.Text = "حفظ"
        '
        'GridVouchers
        '
        Me.GridVouchers.AllowUserToAddRows = False
        Me.GridVouchers.AllowUserToDeleteRows = False
        Me.GridVouchers.AllowUserToResizeRows = False
        DataGridViewCellStyle1.BackColor = System.Drawing.Color.Khaki
        Me.GridVouchers.AlternatingRowsDefaultCellStyle = DataGridViewCellStyle1
        Me.GridVouchers.Anchor = CType((((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Bottom) _
            Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GridVouchers.AutoSizeRowsMode = System.Windows.Forms.DataGridViewAutoSizeRowsMode.AllCells
        Me.GridVouchers.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.AutoSize
        Me.GridVouchers.Columns.AddRange(New System.Windows.Forms.DataGridViewColumn() {Me.Package, Me.Acc, Me.Column3, Me.Column4, Me.Column1, Me.Credit})
        Me.GridVouchers.Location = New System.Drawing.Point(9, 132)
        Me.GridVouchers.Name = "GridVouchers"
        Me.GridVouchers.Size = New System.Drawing.Size(924, 258)
        Me.GridVouchers.TabIndex = 3
        '
        'Package
        '
        DataGridViewCellStyle2.WrapMode = System.Windows.Forms.DataGridViewTriState.[True]
        Me.Package.DefaultCellStyle = DataGridViewCellStyle2
        Me.Package.FillWeight = 406.0914!
        Me.Package.HeaderText = "الحساب"
        Me.Package.Name = "Package"
        '
        'Acc
        '
        DataGridViewCellStyle3.WrapMode = System.Windows.Forms.DataGridViewTriState.[True]
        Me.Acc.DefaultCellStyle = DataGridViewCellStyle3
        Me.Acc.FillWeight = 56.27266!
        Me.Acc.HeaderText = "=>"
        Me.Acc.Name = "Acc"
        Me.Acc.Width = 125
        '
        'Column3
        '
        DataGridViewCellStyle4.WrapMode = System.Windows.Forms.DataGridViewTriState.[True]
        Me.Column3.DefaultCellStyle = DataGridViewCellStyle4
        Me.Column3.FillWeight = 56.27266!
        Me.Column3.HeaderText = "=>"
        Me.Column3.Name = "Column3"
        Me.Column3.Width = 125
        '
        'Column4
        '
        DataGridViewCellStyle5.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        DataGridViewCellStyle5.WrapMode = System.Windows.Forms.DataGridViewTriState.[True]
        Me.Column4.DefaultCellStyle = DataGridViewCellStyle5
        Me.Column4.FillWeight = 56.27266!
        Me.Column4.HeaderText = "=>"
        Me.Column4.Name = "Column4"
        Me.Column4.Width = 200
        '
        'Column1
        '
        Me.Column1.HeaderText = "التفاصيل"
        Me.Column1.Name = "Column1"
        Me.Column1.Width = 150
        '
        'Credit
        '
        DataGridViewCellStyle6.Alignment = System.Windows.Forms.DataGridViewContentAlignment.MiddleLeft
        DataGridViewCellStyle6.Format = "N2"
        DataGridViewCellStyle6.NullValue = "0"
        Me.Credit.DefaultCellStyle = DataGridViewCellStyle6
        Me.Credit.FillWeight = 56.27266!
        Me.Credit.HeaderText = "الرصيد"
        Me.Credit.Name = "Credit"
        '
        'GroupBox4
        '
        Me.GroupBox4.Anchor = CType(((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox4.Controls.Add(Me.Label4)
        Me.GroupBox4.Controls.Add(Me.txtWrittenValue)
        Me.GroupBox4.Controls.Add(Me.Label6)
        Me.GroupBox4.Controls.Add(Me.txtTotalAmount)
        Me.GroupBox4.Location = New System.Drawing.Point(9, 396)
        Me.GroupBox4.Name = "GroupBox4"
        Me.GroupBox4.Size = New System.Drawing.Size(924, 49)
        Me.GroupBox4.TabIndex = 4
        Me.GroupBox4.TabStop = False
        Me.GroupBox4.Text = "اجمالي الرصيد"
        '
        'Label4
        '
        Me.Label4.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label4.AutoSize = True
        Me.Label4.Location = New System.Drawing.Point(730, 23)
        Me.Label4.Name = "Label4"
        Me.Label4.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label4.Size = New System.Drawing.Size(29, 13)
        Me.Label4.TabIndex = 15
        Me.Label4.Text = "كتابتا"
        '
        'txtWrittenValue
        '
        Me.txtWrittenValue.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtWrittenValue.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtWrittenValue.Location = New System.Drawing.Point(35, 21)
        Me.txtWrittenValue.Name = "txtWrittenValue"
        Me.txtWrittenValue.ReadOnly = True
        Me.txtWrittenValue.Size = New System.Drawing.Size(689, 20)
        Me.txtWrittenValue.TabIndex = 1
        '
        'Label6
        '
        Me.Label6.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label6.AutoSize = True
        Me.Label6.Location = New System.Drawing.Point(881, 23)
        Me.Label6.Name = "Label6"
        Me.Label6.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label6.Size = New System.Drawing.Size(37, 13)
        Me.Label6.TabIndex = 13
        Me.Label6.Text = "الرصيد"
        '
        'txtTotalAmount
        '
        Me.txtTotalAmount.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtTotalAmount.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtTotalAmount.Location = New System.Drawing.Point(769, 21)
        Me.txtTotalAmount.Name = "txtTotalAmount"
        Me.txtTotalAmount.ReadOnly = True
        Me.txtTotalAmount.Size = New System.Drawing.Size(106, 20)
        Me.txtTotalAmount.TabIndex = 0
        Me.txtTotalAmount.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'GroupBox7
        '
        Me.GroupBox7.Anchor = CType(((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox7.Controls.Add(Me.Label7)
        Me.GroupBox7.Controls.Add(Me.CombBank)
        Me.GroupBox7.Controls.Add(Me.txtChNo)
        Me.GroupBox7.Controls.Add(Me.RBank)
        Me.GroupBox7.Controls.Add(Me.RCash)
        Me.GroupBox7.Location = New System.Drawing.Point(9, 447)
        Me.GroupBox7.Name = "GroupBox7"
        Me.GroupBox7.Size = New System.Drawing.Size(924, 49)
        Me.GroupBox7.TabIndex = 5
        Me.GroupBox7.TabStop = False
        Me.GroupBox7.Text = "Payment Type (Debit Side)"
        '
        'Label7
        '
        Me.Label7.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.Label7.AutoSize = True
        Me.Label7.Location = New System.Drawing.Point(611, 21)
        Me.Label7.Name = "Label7"
        Me.Label7.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label7.Size = New System.Drawing.Size(44, 13)
        Me.Label7.TabIndex = 16
        Me.Label7.Text = "الحساب"
        '
        'CombBank
        '
        Me.CombBank.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.CombBank.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombBank.FormattingEnabled = True
        Me.CombBank.Items.AddRange(New Object() {"بنك المزارع التجاري", "البنك العقاري التجاري"})
        Me.CombBank.Location = New System.Drawing.Point(302, 18)
        Me.CombBank.Name = "CombBank"
        Me.CombBank.Size = New System.Drawing.Size(303, 21)
        Me.CombBank.TabIndex = 3
        '
        'txtChNo
        '
        Me.txtChNo.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.txtChNo.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtChNo.Location = New System.Drawing.Point(661, 19)
        Me.txtChNo.Name = "txtChNo"
        Me.txtChNo.Size = New System.Drawing.Size(126, 20)
        Me.txtChNo.TabIndex = 2
        Me.txtChNo.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'RBank
        '
        Me.RBank.Anchor = System.Windows.Forms.AnchorStyles.Right
        Me.RBank.AutoSize = True
        Me.RBank.Location = New System.Drawing.Point(793, 19)
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
        Me.RCash.Location = New System.Drawing.Point(875, 19)
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
        'txtReceiptNo
        '
        Me.txtReceiptNo.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtReceiptNo.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtReceiptNo.Font = New System.Drawing.Font("Tahoma", 9.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtReceiptNo.Location = New System.Drawing.Point(120, 12)
        Me.txtReceiptNo.Name = "txtReceiptNo"
        Me.txtReceiptNo.Size = New System.Drawing.Size(106, 23)
        Me.txtReceiptNo.TabIndex = 0
        Me.txtReceiptNo.TextAlign = System.Windows.Forms.HorizontalAlignment.Right
        '
        'Label3
        '
        Me.Label3.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label3.AutoSize = True
        Me.Label3.Font = New System.Drawing.Font("Tahoma", 9.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label3.Location = New System.Drawing.Point(14, 14)
        Me.Label3.Name = "Label3"
        Me.Label3.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label3.Size = New System.Drawing.Size(100, 16)
        Me.Label3.TabIndex = 27
        Me.Label3.Text = "رقم سندالقبض"
        '
        'btnShowReceipt
        '
        Me.btnShowReceipt.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.btnShowReceipt.Enabled = False
        Me.btnShowReceipt.Location = New System.Drawing.Point(232, 14)
        Me.btnShowReceipt.Name = "btnShowReceipt"
        Me.btnShowReceipt.Size = New System.Drawing.Size(101, 23)
        Me.btnShowReceipt.TabIndex = 1
        Me.btnShowReceipt.Text = "عرض سند القبض"
        Me.btnShowReceipt.UseVisualStyleBackColor = True
        '
        'frmStudantReceiptVoucher
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(941, 550)
        Me.Controls.Add(Me.btnShowReceipt)
        Me.Controls.Add(Me.Label3)
        Me.Controls.Add(Me.GridVouchers)
        Me.Controls.Add(Me.GroupBox4)
        Me.Controls.Add(Me.txtReceiptNo)
        Me.Controls.Add(Me.GroupBox7)
        Me.Controls.Add(Me.Label2)
        Me.Controls.Add(Me.GroupBox3)
        Me.Controls.Add(Me.DTPTrans)
        Me.Controls.Add(Me.btnClose)
        Me.Controls.Add(Me.GroupBox2)
        Me.Controls.Add(Me.btnGSave)
        Me.Controls.Add(Me.Button1)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.Name = "frmStudantReceiptVoucher"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.RightToLeftLayout = True
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "سداد رسوم "
        Me.GroupBox3.ResumeLayout(False)
        Me.GroupBox3.PerformLayout()
        CType(Me.GridVouchers, System.ComponentModel.ISupportInitialize).EndInit()
        Me.GroupBox4.ResumeLayout(False)
        Me.GroupBox4.PerformLayout()
        Me.GroupBox7.ResumeLayout(False)
        Me.GroupBox7.PerformLayout()
        CType(Me.ErrProv, System.ComponentModel.ISupportInitialize).EndInit()
        Me.ResumeLayout(False)
        Me.PerformLayout()

    End Sub
    Friend WithEvents GroupBox3 As System.Windows.Forms.GroupBox
    Friend WithEvents Button3 As System.Windows.Forms.Button
    Friend WithEvents Label5 As System.Windows.Forms.Label
    Friend WithEvents txtStdIndex As System.Windows.Forms.TextBox
    Friend WithEvents txtStdName As System.Windows.Forms.TextBox
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents Label2 As System.Windows.Forms.Label
    Friend WithEvents DTPTrans As System.Windows.Forms.DateTimePicker
    Friend WithEvents GroupBox2 As System.Windows.Forms.GroupBox
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents btnClose As System.Windows.Forms.Button
    Friend WithEvents btnGSave As System.Windows.Forms.Button
    Friend WithEvents GridVouchers As System.Windows.Forms.DataGridView
    Friend WithEvents GroupBox4 As System.Windows.Forms.GroupBox
    Friend WithEvents Label4 As System.Windows.Forms.Label
    Friend WithEvents txtWrittenValue As System.Windows.Forms.TextBox
    Friend WithEvents Label6 As System.Windows.Forms.Label
    Friend WithEvents txtTotalAmount As System.Windows.Forms.TextBox
    Friend WithEvents GroupBox7 As System.Windows.Forms.GroupBox
    Friend WithEvents Label7 As System.Windows.Forms.Label
    Friend WithEvents CombBank As System.Windows.Forms.ComboBox
    Friend WithEvents txtChNo As System.Windows.Forms.TextBox
    Friend WithEvents RBank As System.Windows.Forms.RadioButton
    Friend WithEvents RCash As System.Windows.Forms.RadioButton
    Friend WithEvents ErrProv As System.Windows.Forms.ErrorProvider
    Friend WithEvents Label9 As System.Windows.Forms.Label
    Friend WithEvents txtBalance As System.Windows.Forms.TextBox
    Friend WithEvents Button2 As System.Windows.Forms.Button
    Friend WithEvents Label3 As System.Windows.Forms.Label
    Friend WithEvents txtReceiptNo As System.Windows.Forms.TextBox
    Friend WithEvents btnShowReceipt As System.Windows.Forms.Button
    Friend WithEvents Package As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Acc As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column3 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column4 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column1 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Credit As System.Windows.Forms.DataGridViewTextBoxColumn
End Class
