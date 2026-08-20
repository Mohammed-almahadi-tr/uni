<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frmDailyChainNew
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
        Dim DataGridViewCellStyle1 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle
        Dim DataGridViewCellStyle2 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmDailyChainNew))
        Me.GroupBox2 = New System.Windows.Forms.GroupBox
        Me.CombSAcc = New System.Windows.Forms.ComboBox
        Me.Label16 = New System.Windows.Forms.Label
        Me.CombAcc = New System.Windows.Forms.ComboBox
        Me.Label1 = New System.Windows.Forms.Label
        Me.CombPack = New System.Windows.Forms.ComboBox
        Me.Label6 = New System.Windows.Forms.Label
        Me.txtAmount = New System.Windows.Forms.TextBox
        Me.txtDescr = New System.Windows.Forms.TextBox
        Me.Label4 = New System.Windows.Forms.Label
        Me.Label3 = New System.Windows.Forms.Label
        Me.combChType = New System.Windows.Forms.ComboBox
        Me.Label2 = New System.Windows.Forms.Label
        Me.GroupBox1 = New System.Windows.Forms.GroupBox
        Me.txtCheqNo = New System.Windows.Forms.TextBox
        Me.Label10 = New System.Windows.Forms.Label
        Me.DataGridView1 = New System.Windows.Forms.DataGridView
        Me.Package = New System.Windows.Forms.DataGridViewTextBoxColumn
        Me.Acc = New System.Windows.Forms.DataGridViewTextBoxColumn
        Me.SAcc = New System.Windows.Forms.DataGridViewTextBoxColumn
        Me.Column1 = New System.Windows.Forms.DataGridViewTextBoxColumn
        Me.Column2 = New System.Windows.Forms.DataGridViewTextBoxColumn
        Me.Credit = New System.Windows.Forms.DataGridViewTextBoxColumn
        Me.Depit = New System.Windows.Forms.DataGridViewTextBoxColumn
        Me.Button2 = New System.Windows.Forms.Button
        Me.txtDep = New System.Windows.Forms.TextBox
        Me.txtCrd = New System.Windows.Forms.TextBox
        Me.txtBalance = New System.Windows.Forms.TextBox
        Me.Label5 = New System.Windows.Forms.Label
        Me.Label8 = New System.Windows.Forms.Label
        Me.Label9 = New System.Windows.Forms.Label
        Me.Button1 = New System.Windows.Forms.Button
        Me.Button3 = New System.Windows.Forms.Button
        Me.GroupBox3 = New System.Windows.Forms.GroupBox
        Me.GroupBox6 = New System.Windows.Forms.GroupBox
        Me.GroupBox4 = New System.Windows.Forms.GroupBox
        Me.DateTimePicker1 = New System.Windows.Forms.DateTimePicker
        Me.Label7 = New System.Windows.Forms.Label
        Me.GroupBox2.SuspendLayout()
        Me.GroupBox1.SuspendLayout()
        CType(Me.DataGridView1, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.GroupBox3.SuspendLayout()
        Me.GroupBox4.SuspendLayout()
        Me.SuspendLayout()
        '
        'GroupBox2
        '
        Me.GroupBox2.Controls.Add(Me.CombSAcc)
        Me.GroupBox2.Controls.Add(Me.Label16)
        Me.GroupBox2.Controls.Add(Me.CombAcc)
        Me.GroupBox2.Controls.Add(Me.Label1)
        Me.GroupBox2.Controls.Add(Me.CombPack)
        Me.GroupBox2.Controls.Add(Me.Label6)
        Me.GroupBox2.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.GroupBox2.Location = New System.Drawing.Point(8, 2)
        Me.GroupBox2.Name = "GroupBox2"
        Me.GroupBox2.Size = New System.Drawing.Size(787, 49)
        Me.GroupBox2.TabIndex = 0
        Me.GroupBox2.TabStop = False
        Me.GroupBox2.Text = "«·Õ”«»"
        '
        'CombSAcc
        '
        Me.CombSAcc.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombSAcc.DropDownWidth = 250
        Me.CombSAcc.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.CombSAcc.Location = New System.Drawing.Point(6, 16)
        Me.CombSAcc.MaxDropDownItems = 15
        Me.CombSAcc.Name = "CombSAcc"
        Me.CombSAcc.Size = New System.Drawing.Size(180, 21)
        Me.CombSAcc.Sorted = True
        Me.CombSAcc.TabIndex = 2
        '
        'Label16
        '
        Me.Label16.AutoSize = True
        Me.Label16.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label16.Location = New System.Drawing.Point(191, 20)
        Me.Label16.Name = "Label16"
        Me.Label16.Size = New System.Drawing.Size(89, 13)
        Me.Label16.TabIndex = 86
        Me.Label16.Text = "«·Õ”«» «·›—⁄Ì :"
        Me.Label16.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'CombAcc
        '
        Me.CombAcc.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombAcc.DropDownWidth = 200
        Me.CombAcc.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.CombAcc.Location = New System.Drawing.Point(301, 16)
        Me.CombAcc.MaxDropDownItems = 15
        Me.CombAcc.Name = "CombAcc"
        Me.CombAcc.Size = New System.Drawing.Size(180, 21)
        Me.CombAcc.Sorted = True
        Me.CombAcc.TabIndex = 1
        '
        'Label1
        '
        Me.Label1.AutoSize = True
        Me.Label1.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label1.Location = New System.Drawing.Point(486, 20)
        Me.Label1.Name = "Label1"
        Me.Label1.Size = New System.Drawing.Size(51, 13)
        Me.Label1.TabIndex = 23
        Me.Label1.Text = "«·Õ”«» :"
        Me.Label1.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'CombPack
        '
        Me.CombPack.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombPack.DropDownWidth = 150
        Me.CombPack.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.CombPack.Items.AddRange(New Object() {"√—»«Õ Ê Œ”«∆—", "«” À„«—« ", "√’Ê· À«» …", "√’Ê· „ œ«Ê·…", "ÕﬁÊﬁ «·„·ﬂÌ…", "œ«∆‰Ê‰", "„Œ’’«  Ê „” Õﬁ« ", "„œÌ‰Ê‰", "‰Ÿ«„Ì…"})
        Me.CombPack.Location = New System.Drawing.Point(564, 16)
        Me.CombPack.MaxDropDownItems = 15
        Me.CombPack.Name = "CombPack"
        Me.CombPack.Size = New System.Drawing.Size(152, 21)
        Me.CombPack.Sorted = True
        Me.CombPack.TabIndex = 0
        '
        'Label6
        '
        Me.Label6.AutoSize = True
        Me.Label6.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label6.Location = New System.Drawing.Point(718, 20)
        Me.Label6.Name = "Label6"
        Me.Label6.Size = New System.Drawing.Size(44, 13)
        Me.Label6.TabIndex = 83
        Me.Label6.Text = "«·Õ“„… :"
        Me.Label6.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'txtAmount
        '
        Me.txtAmount.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAmount.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtAmount.Location = New System.Drawing.Point(317, 17)
        Me.txtAmount.Name = "txtAmount"
        Me.txtAmount.Size = New System.Drawing.Size(121, 21)
        Me.txtAmount.TabIndex = 1
        '
        'txtDescr
        '
        Me.txtDescr.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtDescr.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtDescr.Location = New System.Drawing.Point(166, 44)
        Me.txtDescr.Name = "txtDescr"
        Me.txtDescr.Size = New System.Drawing.Size(423, 21)
        Me.txtDescr.TabIndex = 2
        '
        'Label4
        '
        Me.Label4.AutoSize = True
        Me.Label4.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label4.Location = New System.Drawing.Point(591, 48)
        Me.Label4.Name = "Label4"
        Me.Label4.Size = New System.Drawing.Size(38, 13)
        Me.Label4.TabIndex = 30
        Me.Label4.Text = "«·»Ì«‰ :"
        Me.Label4.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label3
        '
        Me.Label3.AutoSize = True
        Me.Label3.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label3.Location = New System.Drawing.Point(440, 21)
        Me.Label3.Name = "Label3"
        Me.Label3.Size = New System.Drawing.Size(41, 13)
        Me.Label3.TabIndex = 27
        Me.Label3.Text = "«·„»·€ :"
        Me.Label3.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'combChType
        '
        Me.combChType.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.combChType.DropDownWidth = 73
        Me.combChType.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.combChType.Items.AddRange(New Object() {"„œÌ‰", "œ«∆‰"})
        Me.combChType.Location = New System.Drawing.Point(516, 17)
        Me.combChType.Name = "combChType"
        Me.combChType.Size = New System.Drawing.Size(73, 21)
        Me.combChType.TabIndex = 0
        '
        'Label2
        '
        Me.Label2.AutoSize = True
        Me.Label2.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label2.Location = New System.Drawing.Point(591, 21)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(61, 13)
        Me.Label2.TabIndex = 25
        Me.Label2.Text = "‰Ê⁄ «·Õ—ﬂ… :"
        Me.Label2.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'GroupBox1
        '
        Me.GroupBox1.Controls.Add(Me.txtCheqNo)
        Me.GroupBox1.Controls.Add(Me.Label10)
        Me.GroupBox1.Controls.Add(Me.txtAmount)
        Me.GroupBox1.Controls.Add(Me.Label4)
        Me.GroupBox1.Controls.Add(Me.Label3)
        Me.GroupBox1.Controls.Add(Me.txtDescr)
        Me.GroupBox1.Controls.Add(Me.Label2)
        Me.GroupBox1.Controls.Add(Me.combChType)
        Me.GroupBox1.Location = New System.Drawing.Point(135, 53)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(660, 75)
        Me.GroupBox1.TabIndex = 1
        Me.GroupBox1.TabStop = False
        Me.GroupBox1.Text = " ›«’Ì· «·Õ—ﬂ…"
        '
        'txtCheqNo
        '
        Me.txtCheqNo.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtCheqNo.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtCheqNo.Location = New System.Drawing.Point(6, 44)
        Me.txtCheqNo.Name = "txtCheqNo"
        Me.txtCheqNo.Size = New System.Drawing.Size(79, 21)
        Me.txtCheqNo.TabIndex = 3
        Me.txtCheqNo.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label10
        '
        Me.Label10.AutoSize = True
        Me.Label10.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label10.Location = New System.Drawing.Point(91, 48)
        Me.Label10.Name = "Label10"
        Me.Label10.Size = New System.Drawing.Size(65, 13)
        Me.Label10.TabIndex = 32
        Me.Label10.Text = "—ﬁ„ «·‘Ìﬂ :"
        Me.Label10.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'DataGridView1
        '
        Me.DataGridView1.AllowUserToAddRows = False
        Me.DataGridView1.AllowUserToResizeRows = False
        Me.DataGridView1.AutoSizeColumnsMode = System.Windows.Forms.DataGridViewAutoSizeColumnsMode.Fill
        Me.DataGridView1.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.AutoSize
        Me.DataGridView1.Columns.AddRange(New System.Windows.Forms.DataGridViewColumn() {Me.Package, Me.Acc, Me.SAcc, Me.Column1, Me.Column2, Me.Credit, Me.Depit})
        Me.DataGridView1.Location = New System.Drawing.Point(8, 136)
        Me.DataGridView1.Name = "DataGridView1"
        Me.DataGridView1.ReadOnly = True
        Me.DataGridView1.Size = New System.Drawing.Size(787, 235)
        Me.DataGridView1.TabIndex = 3
        '
        'Package
        '
        Me.Package.HeaderText = "«·Õ“„…"
        Me.Package.Name = "Package"
        Me.Package.ReadOnly = True
        '
        'Acc
        '
        Me.Acc.HeaderText = "«·Õ”«»"
        Me.Acc.Name = "Acc"
        Me.Acc.ReadOnly = True
        '
        'SAcc
        '
        Me.SAcc.HeaderText = "«·Õ”«» «·›—⁄Ì"
        Me.SAcc.Name = "SAcc"
        Me.SAcc.ReadOnly = True
        '
        'Column1
        '
        Me.Column1.HeaderText = "«·»Ì«‰"
        Me.Column1.Name = "Column1"
        Me.Column1.ReadOnly = True
        '
        'Column2
        '
        Me.Column2.HeaderText = "—ﬁ„ «·‘Ìﬂ"
        Me.Column2.Name = "Column2"
        Me.Column2.ReadOnly = True
        '
        'Credit
        '
        DataGridViewCellStyle1.Format = "N2"
        DataGridViewCellStyle1.NullValue = "0"
        Me.Credit.DefaultCellStyle = DataGridViewCellStyle1
        Me.Credit.HeaderText = "œ«∆‰"
        Me.Credit.Name = "Credit"
        Me.Credit.ReadOnly = True
        '
        'Depit
        '
        DataGridViewCellStyle2.Format = "N2"
        DataGridViewCellStyle2.NullValue = "0"
        Me.Depit.DefaultCellStyle = DataGridViewCellStyle2
        Me.Depit.HeaderText = "„œÌ‰"
        Me.Depit.Name = "Depit"
        Me.Depit.ReadOnly = True
        '
        'Button2
        '
        Me.Button2.Location = New System.Drawing.Point(54, 93)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(75, 32)
        Me.Button2.TabIndex = 2
        Me.Button2.Text = "≈÷«›…"
        '
        'txtDep
        '
        Me.txtDep.BackColor = System.Drawing.Color.Black
        Me.txtDep.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtDep.Font = New System.Drawing.Font("Microsoft Sans Serif", 12.0!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(178, Byte))
        Me.txtDep.ForeColor = System.Drawing.Color.GreenYellow
        Me.txtDep.Location = New System.Drawing.Point(293, 13)
        Me.txtDep.Name = "txtDep"
        Me.txtDep.ReadOnly = True
        Me.txtDep.Size = New System.Drawing.Size(163, 26)
        Me.txtDep.TabIndex = 42
        Me.txtDep.Text = "0.00"
        Me.txtDep.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'txtCrd
        '
        Me.txtCrd.BackColor = System.Drawing.Color.Black
        Me.txtCrd.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtCrd.Font = New System.Drawing.Font("Microsoft Sans Serif", 12.0!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(178, Byte))
        Me.txtCrd.ForeColor = System.Drawing.Color.GreenYellow
        Me.txtCrd.Location = New System.Drawing.Point(567, 13)
        Me.txtCrd.Name = "txtCrd"
        Me.txtCrd.ReadOnly = True
        Me.txtCrd.Size = New System.Drawing.Size(163, 26)
        Me.txtCrd.TabIndex = 43
        Me.txtCrd.Text = "0.00"
        Me.txtCrd.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'txtBalance
        '
        Me.txtBalance.BackColor = System.Drawing.Color.Black
        Me.txtBalance.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtBalance.Font = New System.Drawing.Font("Microsoft Sans Serif", 12.0!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(178, Byte))
        Me.txtBalance.ForeColor = System.Drawing.Color.GreenYellow
        Me.txtBalance.Location = New System.Drawing.Point(12, 13)
        Me.txtBalance.Name = "txtBalance"
        Me.txtBalance.ReadOnly = True
        Me.txtBalance.Size = New System.Drawing.Size(163, 26)
        Me.txtBalance.TabIndex = 43
        Me.txtBalance.Text = "0.00"
        Me.txtBalance.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label5
        '
        Me.Label5.AutoSize = True
        Me.Label5.Font = New System.Drawing.Font("Times New Roman", 12.0!, System.Drawing.FontStyle.Bold)
        Me.Label5.Location = New System.Drawing.Point(736, 17)
        Me.Label5.Name = "Label5"
        Me.Label5.Size = New System.Drawing.Size(40, 19)
        Me.Label5.TabIndex = 92
        Me.Label5.Text = "œ«∆‰ :"
        Me.Label5.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label8
        '
        Me.Label8.AutoSize = True
        Me.Label8.Font = New System.Drawing.Font("Times New Roman", 12.0!, System.Drawing.FontStyle.Bold)
        Me.Label8.Location = New System.Drawing.Point(462, 17)
        Me.Label8.Name = "Label8"
        Me.Label8.Size = New System.Drawing.Size(43, 19)
        Me.Label8.TabIndex = 93
        Me.Label8.Text = "„œÌ‰ :"
        Me.Label8.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label9
        '
        Me.Label9.AutoSize = True
        Me.Label9.Font = New System.Drawing.Font("Times New Roman", 12.0!, System.Drawing.FontStyle.Bold)
        Me.Label9.Location = New System.Drawing.Point(181, 17)
        Me.Label9.Name = "Label9"
        Me.Label9.Size = New System.Drawing.Size(55, 19)
        Me.Label9.TabIndex = 94
        Me.Label9.Text = "«·„ »ﬁÌ :"
        Me.Label9.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Button1
        '
        Me.Button1.Location = New System.Drawing.Point(720, 483)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 32)
        Me.Button1.TabIndex = 4
        Me.Button1.Text = "Õ›Ÿ"
        '
        'Button3
        '
        Me.Button3.Location = New System.Drawing.Point(615, 483)
        Me.Button3.Name = "Button3"
        Me.Button3.Size = New System.Drawing.Size(75, 32)
        Me.Button3.TabIndex = 5
        Me.Button3.Text = "≈€·«ﬁ"
        '
        'GroupBox3
        '
        Me.GroupBox3.Controls.Add(Me.txtCrd)
        Me.GroupBox3.Controls.Add(Me.Label5)
        Me.GroupBox3.Controls.Add(Me.txtDep)
        Me.GroupBox3.Controls.Add(Me.Label9)
        Me.GroupBox3.Controls.Add(Me.Label8)
        Me.GroupBox3.Controls.Add(Me.txtBalance)
        Me.GroupBox3.Location = New System.Drawing.Point(8, 372)
        Me.GroupBox3.Name = "GroupBox3"
        Me.GroupBox3.Size = New System.Drawing.Size(787, 47)
        Me.GroupBox3.TabIndex = 97
        Me.GroupBox3.TabStop = False
        '
        'GroupBox6
        '
        Me.GroupBox6.Location = New System.Drawing.Point(8, 473)
        Me.GroupBox6.Name = "GroupBox6"
        Me.GroupBox6.Size = New System.Drawing.Size(787, 4)
        Me.GroupBox6.TabIndex = 98
        Me.GroupBox6.TabStop = False
        '
        'GroupBox4
        '
        Me.GroupBox4.Controls.Add(Me.DateTimePicker1)
        Me.GroupBox4.Controls.Add(Me.Label7)
        Me.GroupBox4.Location = New System.Drawing.Point(8, 422)
        Me.GroupBox4.Name = "GroupBox4"
        Me.GroupBox4.Size = New System.Drawing.Size(787, 47)
        Me.GroupBox4.TabIndex = 98
        Me.GroupBox4.TabStop = False
        '
        'DateTimePicker1
        '
        Me.DateTimePicker1.Font = New System.Drawing.Font("Tahoma", 9.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.DateTimePicker1.Location = New System.Drawing.Point(447, 16)
        Me.DateTimePicker1.Name = "DateTimePicker1"
        Me.DateTimePicker1.Size = New System.Drawing.Size(251, 23)
        Me.DateTimePicker1.TabIndex = 94
        '
        'Label7
        '
        Me.Label7.AutoSize = True
        Me.Label7.Font = New System.Drawing.Font("Times New Roman", 12.0!, System.Drawing.FontStyle.Bold)
        Me.Label7.Location = New System.Drawing.Point(704, 17)
        Me.Label7.Name = "Label7"
        Me.Label7.Size = New System.Drawing.Size(72, 19)
        Me.Label7.TabIndex = 93
        Me.Label7.Text = " «—ÌŒ «·ﬁÌœ :"
        Me.Label7.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'frmDailyChainNew
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(803, 519)
        Me.Controls.Add(Me.GroupBox4)
        Me.Controls.Add(Me.GroupBox6)
        Me.Controls.Add(Me.GroupBox3)
        Me.Controls.Add(Me.Button3)
        Me.Controls.Add(Me.Button1)
        Me.Controls.Add(Me.Button2)
        Me.Controls.Add(Me.DataGridView1)
        Me.Controls.Add(Me.GroupBox1)
        Me.Controls.Add(Me.GroupBox2)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MaximizeBox = False
        Me.MaximumSize = New System.Drawing.Size(811, 553)
        Me.MinimumSize = New System.Drawing.Size(811, 553)
        Me.Name = "frmDailyChainNew"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "ﬁÌœ Õ—ﬂ…"
        Me.GroupBox2.ResumeLayout(False)
        Me.GroupBox2.PerformLayout()
        Me.GroupBox1.ResumeLayout(False)
        Me.GroupBox1.PerformLayout()
        CType(Me.DataGridView1, System.ComponentModel.ISupportInitialize).EndInit()
        Me.GroupBox3.ResumeLayout(False)
        Me.GroupBox3.PerformLayout()
        Me.GroupBox4.ResumeLayout(False)
        Me.GroupBox4.PerformLayout()
        Me.ResumeLayout(False)

    End Sub
    Friend WithEvents GroupBox2 As System.Windows.Forms.GroupBox
    Friend WithEvents txtAmount As System.Windows.Forms.TextBox
    Friend WithEvents txtDescr As System.Windows.Forms.TextBox
    Friend WithEvents CombSAcc As System.Windows.Forms.ComboBox
    Friend WithEvents Label16 As System.Windows.Forms.Label
    Friend WithEvents Label4 As System.Windows.Forms.Label
    Friend WithEvents CombAcc As System.Windows.Forms.ComboBox
    Friend WithEvents Label3 As System.Windows.Forms.Label
    Friend WithEvents combChType As System.Windows.Forms.ComboBox
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents Label2 As System.Windows.Forms.Label
    Friend WithEvents CombPack As System.Windows.Forms.ComboBox
    Friend WithEvents Label6 As System.Windows.Forms.Label
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents DataGridView1 As System.Windows.Forms.DataGridView
    Friend WithEvents Button2 As System.Windows.Forms.Button
    Friend WithEvents txtDep As System.Windows.Forms.TextBox
    Friend WithEvents txtCrd As System.Windows.Forms.TextBox
    Friend WithEvents txtBalance As System.Windows.Forms.TextBox
    Friend WithEvents Label5 As System.Windows.Forms.Label
    Friend WithEvents Label8 As System.Windows.Forms.Label
    Friend WithEvents Label9 As System.Windows.Forms.Label
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents Button3 As System.Windows.Forms.Button
    Friend WithEvents GroupBox3 As System.Windows.Forms.GroupBox
    Friend WithEvents GroupBox6 As System.Windows.Forms.GroupBox
    Friend WithEvents GroupBox4 As System.Windows.Forms.GroupBox
    Friend WithEvents Label7 As System.Windows.Forms.Label
    Friend WithEvents DateTimePicker1 As System.Windows.Forms.DateTimePicker
    Friend WithEvents txtCheqNo As System.Windows.Forms.TextBox
    Friend WithEvents Label10 As System.Windows.Forms.Label
    Friend WithEvents Package As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Acc As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents SAcc As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column1 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column2 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Credit As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Depit As System.Windows.Forms.DataGridViewTextBoxColumn
End Class
