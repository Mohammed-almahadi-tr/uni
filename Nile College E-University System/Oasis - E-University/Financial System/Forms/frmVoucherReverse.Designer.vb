<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frmVoucherReverse
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
        Dim DataGridViewCellStyle1 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim DataGridViewCellStyle2 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim DataGridViewCellStyle3 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim DataGridViewCellStyle4 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim DataGridViewCellStyle5 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim DataGridViewCellStyle6 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim DataGridViewCellStyle7 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim DataGridViewCellStyle8 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmVoucherReverse))
        Me.Button3 = New System.Windows.Forms.Button()
        Me.Button1 = New System.Windows.Forms.Button()
        Me.Button4 = New System.Windows.Forms.Button()
        Me.GroupBox4 = New System.Windows.Forms.GroupBox()
        Me.Label10 = New System.Windows.Forms.Label()
        Me.CombTransYear = New System.Windows.Forms.ComboBox()
        Me.Label7 = New System.Windows.Forms.Label()
        Me.txtMoveNo = New System.Windows.Forms.TextBox()
        Me.GridVouchers = New System.Windows.Forms.DataGridView()
        Me.Package = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Acc = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column3 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column4 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column6 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column2 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column5 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column1 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Depit = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Credit = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Label6 = New System.Windows.Forms.Label()
        Me.DTPTrans = New System.Windows.Forms.DateTimePicker()
        Me.lblStatus = New System.Windows.Forms.Label()
        Me.GroupBox4.SuspendLayout()
        CType(Me.GridVouchers, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.SuspendLayout()
        '
        'Button3
        '
        Me.Button3.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Button3.Location = New System.Drawing.Point(1199, 387)
        Me.Button3.Name = "Button3"
        Me.Button3.Size = New System.Drawing.Size(75, 32)
        Me.Button3.TabIndex = 7
        Me.Button3.Text = "اغلاق"
        '
        'Button1
        '
        Me.Button1.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Button1.Location = New System.Drawing.Point(1086, 387)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 32)
        Me.Button1.TabIndex = 6
        Me.Button1.Text = "حفظ"
        '
        'Button4
        '
        Me.Button4.Location = New System.Drawing.Point(322, 21)
        Me.Button4.Name = "Button4"
        Me.Button4.Size = New System.Drawing.Size(75, 24)
        Me.Button4.TabIndex = 1
        Me.Button4.Text = "عرض"
        '
        'GroupBox4
        '
        Me.GroupBox4.Controls.Add(Me.Label10)
        Me.GroupBox4.Controls.Add(Me.CombTransYear)
        Me.GroupBox4.Controls.Add(Me.Label7)
        Me.GroupBox4.Controls.Add(Me.txtMoveNo)
        Me.GroupBox4.Location = New System.Drawing.Point(10, 4)
        Me.GroupBox4.Name = "GroupBox4"
        Me.GroupBox4.Size = New System.Drawing.Size(306, 50)
        Me.GroupBox4.TabIndex = 0
        Me.GroupBox4.TabStop = False
        '
        'Label10
        '
        Me.Label10.AutoSize = True
        Me.Label10.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label10.Location = New System.Drawing.Point(130, 23)
        Me.Label10.Name = "Label10"
        Me.Label10.Size = New System.Drawing.Size(29, 13)
        Me.Label10.TabIndex = 86
        Me.Label10.Text = "العام"
        Me.Label10.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'CombTransYear
        '
        Me.CombTransYear.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombTransYear.FormattingEnabled = True
        Me.CombTransYear.Location = New System.Drawing.Point(36, 18)
        Me.CombTransYear.Name = "CombTransYear"
        Me.CombTransYear.Size = New System.Drawing.Size(88, 21)
        Me.CombTransYear.TabIndex = 85
        '
        'Label7
        '
        Me.Label7.AutoSize = True
        Me.Label7.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label7.Location = New System.Drawing.Point(251, 22)
        Me.Label7.Name = "Label7"
        Me.Label7.Size = New System.Drawing.Size(49, 13)
        Me.Label7.TabIndex = 84
        Me.Label7.Text = "رقم القيد"
        Me.Label7.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'txtMoveNo
        '
        Me.txtMoveNo.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtMoveNo.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtMoveNo.Location = New System.Drawing.Point(165, 18)
        Me.txtMoveNo.Name = "txtMoveNo"
        Me.txtMoveNo.Size = New System.Drawing.Size(80, 21)
        Me.txtMoveNo.TabIndex = 1
        Me.txtMoveNo.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
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
        Me.GridVouchers.Columns.AddRange(New System.Windows.Forms.DataGridViewColumn() {Me.Package, Me.Acc, Me.Column3, Me.Column4, Me.Column6, Me.Column2, Me.Column5, Me.Column1, Me.Depit, Me.Credit})
        Me.GridVouchers.Location = New System.Drawing.Point(8, 60)
        Me.GridVouchers.Name = "GridVouchers"
        Me.GridVouchers.ReadOnly = True
        Me.GridVouchers.Size = New System.Drawing.Size(1266, 321)
        Me.GridVouchers.TabIndex = 102
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
        Me.Acc.Width = 150
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
        'Column6
        '
        Me.Column6.HeaderText = "=>"
        Me.Column6.Name = "Column6"
        Me.Column6.ReadOnly = True
        Me.Column6.Width = 150
        '
        'Column2
        '
        Me.Column2.HeaderText = "رقم الطالب"
        Me.Column2.Name = "Column2"
        Me.Column2.ReadOnly = True
        Me.Column2.Width = 90
        '
        'Column5
        '
        Me.Column5.HeaderText = "اسم الطالب"
        Me.Column5.Name = "Column5"
        Me.Column5.ReadOnly = True
        Me.Column5.Width = 150
        '
        'Column1
        '
        DataGridViewCellStyle6.WrapMode = System.Windows.Forms.DataGridViewTriState.[True]
        Me.Column1.DefaultCellStyle = DataGridViewCellStyle6
        Me.Column1.FillWeight = 56.27266!
        Me.Column1.HeaderText = "التفاصيل"
        Me.Column1.Name = "Column1"
        Me.Column1.ReadOnly = True
        Me.Column1.Width = 200
        '
        'Depit
        '
        DataGridViewCellStyle7.Alignment = System.Windows.Forms.DataGridViewContentAlignment.MiddleLeft
        DataGridViewCellStyle7.Format = "N2"
        DataGridViewCellStyle7.NullValue = "0"
        Me.Depit.DefaultCellStyle = DataGridViewCellStyle7
        Me.Depit.FillWeight = 56.27266!
        Me.Depit.HeaderText = "Debit"
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
        Me.Credit.HeaderText = "Credit"
        Me.Credit.Name = "Credit"
        Me.Credit.ReadOnly = True
        Me.Credit.Width = 80
        '
        'Label6
        '
        Me.Label6.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left), System.Windows.Forms.AnchorStyles)
        Me.Label6.AutoSize = True
        Me.Label6.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label6.Location = New System.Drawing.Point(12, 392)
        Me.Label6.Name = "Label6"
        Me.Label6.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label6.Size = New System.Drawing.Size(41, 13)
        Me.Label6.TabIndex = 128
        Me.Label6.Text = "التاريخ"
        '
        'DTPTrans
        '
        Me.DTPTrans.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left), System.Windows.Forms.AnchorStyles)
        Me.DTPTrans.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.DTPTrans.Location = New System.Drawing.Point(59, 387)
        Me.DTPTrans.Name = "DTPTrans"
        Me.DTPTrans.Size = New System.Drawing.Size(212, 21)
        Me.DTPTrans.TabIndex = 129
        '
        'lblStatus
        '
        Me.lblStatus.AutoSize = True
        Me.lblStatus.Font = New System.Drawing.Font("Tahoma", 12.0!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.lblStatus.ForeColor = System.Drawing.Color.Red
        Me.lblStatus.Location = New System.Drawing.Point(409, 22)
        Me.lblStatus.Name = "lblStatus"
        Me.lblStatus.Size = New System.Drawing.Size(85, 19)
        Me.lblStatus.TabIndex = 130
        Me.lblStatus.Text = "Reversed"
        '
        'frmVoucherReverse
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(1283, 425)
        Me.Controls.Add(Me.lblStatus)
        Me.Controls.Add(Me.Label6)
        Me.Controls.Add(Me.DTPTrans)
        Me.Controls.Add(Me.GridVouchers)
        Me.Controls.Add(Me.Button4)
        Me.Controls.Add(Me.GroupBox4)
        Me.Controls.Add(Me.Button3)
        Me.Controls.Add(Me.Button1)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.Name = "frmVoucherReverse"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.RightToLeftLayout = True
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "عكس قيد"
        Me.WindowState = System.Windows.Forms.FormWindowState.Maximized
        Me.GroupBox4.ResumeLayout(False)
        Me.GroupBox4.PerformLayout()
        CType(Me.GridVouchers, System.ComponentModel.ISupportInitialize).EndInit()
        Me.ResumeLayout(False)
        Me.PerformLayout()

    End Sub
    Friend WithEvents Button3 As System.Windows.Forms.Button
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents Button4 As System.Windows.Forms.Button
    Friend WithEvents GroupBox4 As System.Windows.Forms.GroupBox
    Friend WithEvents txtMoveNo As System.Windows.Forms.TextBox
    Friend WithEvents Label10 As System.Windows.Forms.Label
    Friend WithEvents CombTransYear As System.Windows.Forms.ComboBox
    Friend WithEvents Label7 As System.Windows.Forms.Label
    Friend WithEvents GridVouchers As System.Windows.Forms.DataGridView
    Friend WithEvents Label6 As System.Windows.Forms.Label
    Friend WithEvents DTPTrans As System.Windows.Forms.DateTimePicker
    Friend WithEvents lblStatus As System.Windows.Forms.Label
    Friend WithEvents Package As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Acc As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column3 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column4 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column6 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column2 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column5 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column1 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Depit As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Credit As System.Windows.Forms.DataGridViewTextBoxColumn
End Class
