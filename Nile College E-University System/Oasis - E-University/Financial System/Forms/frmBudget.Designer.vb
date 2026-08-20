<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frmBudget
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
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmBudget))
        Me.TreeAcc = New System.Windows.Forms.TreeView()
        Me.GroupBox3 = New System.Windows.Forms.GroupBox()
        Me.txtAmount = New System.Windows.Forms.TextBox()
        Me.Label4 = New System.Windows.Forms.Label()
        Me.Button1 = New System.Windows.Forms.Button()
        Me.DTPTo = New System.Windows.Forms.DateTimePicker()
        Me.DTPFrom = New System.Windows.Forms.DateTimePicker()
        Me.Label2 = New System.Windows.Forms.Label()
        Me.Label3 = New System.Windows.Forms.Label()
        Me.txtAcc4 = New System.Windows.Forms.TextBox()
        Me.txtAcc3 = New System.Windows.Forms.TextBox()
        Me.txtAcc2 = New System.Windows.Forms.TextBox()
        Me.txtAcc1 = New System.Windows.Forms.TextBox()
        Me.Label1 = New System.Windows.Forms.Label()
        Me.GridBudget = New System.Windows.Forms.DataGridView()
        Me.Column9 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column1 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column2 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column3 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column6 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column5 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column4 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column7 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column8 = New System.Windows.Forms.DataGridViewButtonColumn()
        Me.GroupBox1 = New System.Windows.Forms.GroupBox()
        Me.DTPRptTo = New System.Windows.Forms.DateTimePicker()
        Me.DTPRptFrom = New System.Windows.Forms.DateTimePicker()
        Me.Label5 = New System.Windows.Forms.Label()
        Me.Label6 = New System.Windows.Forms.Label()
        Me.btnShow = New System.Windows.Forms.Button()
        Me.btnClose = New System.Windows.Forms.Button()
        Me.GroupBox3.SuspendLayout()
        CType(Me.GridBudget, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.GroupBox1.SuspendLayout()
        Me.SuspendLayout()
        '
        'TreeAcc
        '
        Me.TreeAcc.Font = New System.Drawing.Font("Times New Roman", 12.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.TreeAcc.Location = New System.Drawing.Point(0, 0)
        Me.TreeAcc.Name = "TreeAcc"
        Me.TreeAcc.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.TreeAcc.RightToLeftLayout = True
        Me.TreeAcc.Size = New System.Drawing.Size(221, 449)
        Me.TreeAcc.TabIndex = 121
        '
        'GroupBox3
        '
        Me.GroupBox3.Anchor = CType(((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox3.Controls.Add(Me.txtAmount)
        Me.GroupBox3.Controls.Add(Me.Label4)
        Me.GroupBox3.Controls.Add(Me.Button1)
        Me.GroupBox3.Controls.Add(Me.DTPTo)
        Me.GroupBox3.Controls.Add(Me.DTPFrom)
        Me.GroupBox3.Controls.Add(Me.Label2)
        Me.GroupBox3.Controls.Add(Me.Label3)
        Me.GroupBox3.Controls.Add(Me.txtAcc4)
        Me.GroupBox3.Controls.Add(Me.txtAcc3)
        Me.GroupBox3.Controls.Add(Me.txtAcc2)
        Me.GroupBox3.Controls.Add(Me.txtAcc1)
        Me.GroupBox3.Controls.Add(Me.Label1)
        Me.GroupBox3.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.GroupBox3.Location = New System.Drawing.Point(224, 3)
        Me.GroupBox3.Name = "GroupBox3"
        Me.GroupBox3.Size = New System.Drawing.Size(608, 104)
        Me.GroupBox3.TabIndex = 122
        Me.GroupBox3.TabStop = False
        Me.GroupBox3.Text = "Data of estimation "
        '
        'txtAmount
        '
        Me.txtAmount.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtAmount.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAmount.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtAmount.Location = New System.Drawing.Point(58, 73)
        Me.txtAmount.Name = "txtAmount"
        Me.txtAmount.Size = New System.Drawing.Size(123, 21)
        Me.txtAmount.TabIndex = 43
        '
        'Label4
        '
        Me.Label4.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label4.AutoSize = True
        Me.Label4.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label4.Location = New System.Drawing.Point(6, 77)
        Me.Label4.Name = "Label4"
        Me.Label4.Size = New System.Drawing.Size(51, 13)
        Me.Label4.TabIndex = 42
        Me.Label4.Text = "Amount :"
        Me.Label4.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Button1
        '
        Me.Button1.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Button1.Location = New System.Drawing.Point(187, 73)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 23)
        Me.Button1.TabIndex = 41
        Me.Button1.Text = "Sava"
        Me.Button1.UseVisualStyleBackColor = True
        '
        'DTPTo
        '
        Me.DTPTo.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.DTPTo.CustomFormat = "yyyy/MM/dd"
        Me.DTPTo.Format = System.Windows.Forms.DateTimePickerFormat.Custom
        Me.DTPTo.Location = New System.Drawing.Point(219, 20)
        Me.DTPTo.Name = "DTPTo"
        Me.DTPTo.Size = New System.Drawing.Size(123, 21)
        Me.DTPTo.TabIndex = 40
        '
        'DTPFrom
        '
        Me.DTPFrom.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.DTPFrom.CustomFormat = "yyyy/MM/dd"
        Me.DTPFrom.Format = System.Windows.Forms.DateTimePickerFormat.Custom
        Me.DTPFrom.Location = New System.Drawing.Point(58, 20)
        Me.DTPFrom.Name = "DTPFrom"
        Me.DTPFrom.Size = New System.Drawing.Size(123, 21)
        Me.DTPFrom.TabIndex = 39
        '
        'Label2
        '
        Me.Label2.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label2.AutoSize = True
        Me.Label2.Location = New System.Drawing.Point(187, 26)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(26, 13)
        Me.Label2.TabIndex = 38
        Me.Label2.Text = "To :"
        Me.Label2.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label3
        '
        Me.Label3.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label3.AutoSize = True
        Me.Label3.Location = New System.Drawing.Point(6, 26)
        Me.Label3.Name = "Label3"
        Me.Label3.Size = New System.Drawing.Size(31, 13)
        Me.Label3.TabIndex = 37
        Me.Label3.Text = "From"
        Me.Label3.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'txtAcc4
        '
        Me.txtAcc4.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtAcc4.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAcc4.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtAcc4.Location = New System.Drawing.Point(445, 46)
        Me.txtAcc4.Name = "txtAcc4"
        Me.txtAcc4.ReadOnly = True
        Me.txtAcc4.Size = New System.Drawing.Size(147, 21)
        Me.txtAcc4.TabIndex = 36
        '
        'txtAcc3
        '
        Me.txtAcc3.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtAcc3.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAcc3.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtAcc3.Location = New System.Drawing.Point(316, 46)
        Me.txtAcc3.Name = "txtAcc3"
        Me.txtAcc3.ReadOnly = True
        Me.txtAcc3.Size = New System.Drawing.Size(123, 21)
        Me.txtAcc3.TabIndex = 35
        '
        'txtAcc2
        '
        Me.txtAcc2.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtAcc2.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAcc2.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtAcc2.Location = New System.Drawing.Point(187, 46)
        Me.txtAcc2.Name = "txtAcc2"
        Me.txtAcc2.ReadOnly = True
        Me.txtAcc2.Size = New System.Drawing.Size(123, 21)
        Me.txtAcc2.TabIndex = 34
        '
        'txtAcc1
        '
        Me.txtAcc1.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtAcc1.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAcc1.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtAcc1.Location = New System.Drawing.Point(58, 46)
        Me.txtAcc1.Name = "txtAcc1"
        Me.txtAcc1.ReadOnly = True
        Me.txtAcc1.Size = New System.Drawing.Size(123, 21)
        Me.txtAcc1.TabIndex = 33
        '
        'Label1
        '
        Me.Label1.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label1.AutoSize = True
        Me.Label1.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label1.Location = New System.Drawing.Point(6, 50)
        Me.Label1.Name = "Label1"
        Me.Label1.Size = New System.Drawing.Size(53, 13)
        Me.Label1.TabIndex = 23
        Me.Label1.Text = "Account :"
        Me.Label1.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'GridBudget
        '
        Me.GridBudget.AllowUserToAddRows = False
        Me.GridBudget.AllowUserToDeleteRows = False
        DataGridViewCellStyle1.BackColor = System.Drawing.Color.Khaki
        Me.GridBudget.AlternatingRowsDefaultCellStyle = DataGridViewCellStyle1
        Me.GridBudget.Anchor = CType((((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Bottom) _
            Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GridBudget.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.AutoSize
        Me.GridBudget.Columns.AddRange(New System.Windows.Forms.DataGridViewColumn() {Me.Column9, Me.Column1, Me.Column2, Me.Column3, Me.Column6, Me.Column5, Me.Column4, Me.Column7, Me.Column8})
        Me.GridBudget.Location = New System.Drawing.Point(224, 111)
        Me.GridBudget.Name = "GridBudget"
        Me.GridBudget.ReadOnly = True
        Me.GridBudget.Size = New System.Drawing.Size(608, 280)
        Me.GridBudget.TabIndex = 123
        '
        'Column9
        '
        Me.Column9.HeaderText = "SNo"
        Me.Column9.Name = "Column9"
        Me.Column9.ReadOnly = True
        Me.Column9.Visible = False
        '
        'Column1
        '
        Me.Column1.HeaderText = "Period From"
        Me.Column1.Name = "Column1"
        Me.Column1.ReadOnly = True
        '
        'Column2
        '
        Me.Column2.HeaderText = "To"
        Me.Column2.Name = "Column2"
        Me.Column2.ReadOnly = True
        '
        'Column3
        '
        Me.Column3.HeaderText = "Account"
        Me.Column3.Name = "Column3"
        Me.Column3.ReadOnly = True
        '
        'Column6
        '
        Me.Column6.HeaderText = "=>"
        Me.Column6.Name = "Column6"
        Me.Column6.ReadOnly = True
        '
        'Column5
        '
        Me.Column5.HeaderText = "=>"
        Me.Column5.Name = "Column5"
        Me.Column5.ReadOnly = True
        '
        'Column4
        '
        Me.Column4.HeaderText = "=>"
        Me.Column4.Name = "Column4"
        Me.Column4.ReadOnly = True
        Me.Column4.Width = 125
        '
        'Column7
        '
        Me.Column7.HeaderText = "Amount"
        Me.Column7.Name = "Column7"
        Me.Column7.ReadOnly = True
        '
        'Column8
        '
        Me.Column8.HeaderText = "Delete "
        Me.Column8.Name = "Column8"
        Me.Column8.ReadOnly = True
        Me.Column8.Resizable = System.Windows.Forms.DataGridViewTriState.[True]
        Me.Column8.SortMode = System.Windows.Forms.DataGridViewColumnSortMode.Automatic
        Me.Column8.Width = 75
        '
        'GroupBox1
        '
        Me.GroupBox1.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox1.Controls.Add(Me.DTPRptTo)
        Me.GroupBox1.Controls.Add(Me.DTPRptFrom)
        Me.GroupBox1.Controls.Add(Me.Label5)
        Me.GroupBox1.Controls.Add(Me.Label6)
        Me.GroupBox1.Location = New System.Drawing.Point(227, 397)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.RightToLeft = System.Windows.Forms.RightToLeft.No
        Me.GroupBox1.Size = New System.Drawing.Size(349, 45)
        Me.GroupBox1.TabIndex = 124
        Me.GroupBox1.TabStop = False
        Me.GroupBox1.Text = "Period"
        '
        'DTPRptTo
        '
        Me.DTPRptTo.CustomFormat = "yyyy/MM/dd"
        Me.DTPRptTo.Format = System.Windows.Forms.DateTimePickerFormat.Custom
        Me.DTPRptTo.Location = New System.Drawing.Point(220, 15)
        Me.DTPRptTo.Name = "DTPRptTo"
        Me.DTPRptTo.Size = New System.Drawing.Size(123, 20)
        Me.DTPRptTo.TabIndex = 3
        '
        'DTPRptFrom
        '
        Me.DTPRptFrom.CustomFormat = "yyyy/MM/dd"
        Me.DTPRptFrom.Format = System.Windows.Forms.DateTimePickerFormat.Custom
        Me.DTPRptFrom.Location = New System.Drawing.Point(55, 15)
        Me.DTPRptFrom.Name = "DTPRptFrom"
        Me.DTPRptFrom.Size = New System.Drawing.Size(123, 20)
        Me.DTPRptFrom.TabIndex = 2
        '
        'Label5
        '
        Me.Label5.AutoSize = True
        Me.Label5.Location = New System.Drawing.Point(184, 18)
        Me.Label5.Name = "Label5"
        Me.Label5.Size = New System.Drawing.Size(26, 13)
        Me.Label5.TabIndex = 1
        Me.Label5.Text = "To :"
        Me.Label5.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label6
        '
        Me.Label6.AutoSize = True
        Me.Label6.Location = New System.Drawing.Point(16, 17)
        Me.Label6.Name = "Label6"
        Me.Label6.Size = New System.Drawing.Size(38, 13)
        Me.Label6.TabIndex = 0
        Me.Label6.Text = "From :"
        Me.Label6.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'btnShow
        '
        Me.btnShow.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.btnShow.Location = New System.Drawing.Point(592, 405)
        Me.btnShow.Name = "btnShow"
        Me.btnShow.Size = New System.Drawing.Size(75, 32)
        Me.btnShow.TabIndex = 125
        Me.btnShow.Text = "Show"
        '
        'btnClose
        '
        Me.btnClose.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left), System.Windows.Forms.AnchorStyles)
        Me.btnClose.DialogResult = System.Windows.Forms.DialogResult.Cancel
        Me.btnClose.Location = New System.Drawing.Point(682, 405)
        Me.btnClose.Name = "btnClose"
        Me.btnClose.Size = New System.Drawing.Size(75, 32)
        Me.btnClose.TabIndex = 126
        Me.btnClose.Text = "Close "
        '
        'frmBudget
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(844, 449)
        Me.Controls.Add(Me.btnClose)
        Me.Controls.Add(Me.btnShow)
        Me.Controls.Add(Me.GroupBox1)
        Me.Controls.Add(Me.GridBudget)
        Me.Controls.Add(Me.GroupBox3)
        Me.Controls.Add(Me.TreeAcc)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.Name = "frmBudget"
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "Estimated budget"
        Me.WindowState = System.Windows.Forms.FormWindowState.Maximized
        Me.GroupBox3.ResumeLayout(False)
        Me.GroupBox3.PerformLayout()
        CType(Me.GridBudget, System.ComponentModel.ISupportInitialize).EndInit()
        Me.GroupBox1.ResumeLayout(False)
        Me.GroupBox1.PerformLayout()
        Me.ResumeLayout(False)

    End Sub
    Friend WithEvents TreeAcc As System.Windows.Forms.TreeView
    Friend WithEvents GroupBox3 As System.Windows.Forms.GroupBox
    Friend WithEvents txtAcc4 As System.Windows.Forms.TextBox
    Friend WithEvents txtAcc3 As System.Windows.Forms.TextBox
    Friend WithEvents txtAcc2 As System.Windows.Forms.TextBox
    Friend WithEvents txtAcc1 As System.Windows.Forms.TextBox
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents DTPTo As System.Windows.Forms.DateTimePicker
    Friend WithEvents DTPFrom As System.Windows.Forms.DateTimePicker
    Friend WithEvents Label2 As System.Windows.Forms.Label
    Friend WithEvents Label3 As System.Windows.Forms.Label
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents GridBudget As System.Windows.Forms.DataGridView
    Friend WithEvents txtAmount As System.Windows.Forms.TextBox
    Friend WithEvents Label4 As System.Windows.Forms.Label
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents DTPRptTo As System.Windows.Forms.DateTimePicker
    Friend WithEvents DTPRptFrom As System.Windows.Forms.DateTimePicker
    Friend WithEvents Label5 As System.Windows.Forms.Label
    Friend WithEvents Label6 As System.Windows.Forms.Label
    Friend WithEvents btnShow As System.Windows.Forms.Button
    Friend WithEvents btnClose As System.Windows.Forms.Button
    Friend WithEvents Column9 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column1 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column2 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column3 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column6 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column5 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column4 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column7 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column8 As System.Windows.Forms.DataGridViewButtonColumn
End Class
