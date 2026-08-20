<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frmPayBill
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
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmPayBill))
        Me.GroupBox4 = New System.Windows.Forms.GroupBox
        Me.Label3 = New System.Windows.Forms.Label
        Me.txtWrittenValue = New System.Windows.Forms.TextBox
        Me.Label2 = New System.Windows.Forms.Label
        Me.txtAmount = New System.Windows.Forms.TextBox
        Me.GroupBox3 = New System.Windows.Forms.GroupBox
        Me.CombAcc3 = New System.Windows.Forms.ComboBox
        Me.Label9 = New System.Windows.Forms.Label
        Me.CombAcc2 = New System.Windows.Forms.ComboBox
        Me.Label6 = New System.Windows.Forms.Label
        Me.CombPack = New System.Windows.Forms.ComboBox
        Me.Label8 = New System.Windows.Forms.Label
        Me.txtDescr = New System.Windows.Forms.TextBox
        Me.CombBank = New System.Windows.Forms.ComboBox
        Me.txtChNo = New System.Windows.Forms.TextBox
        Me.GroupBox6 = New System.Windows.Forms.GroupBox
        Me.txtSource = New System.Windows.Forms.TextBox
        Me.GroupBox1 = New System.Windows.Forms.GroupBox
        Me.RCash = New System.Windows.Forms.RadioButton
        Me.Button1 = New System.Windows.Forms.Button
        Me.GroupBox5 = New System.Windows.Forms.GroupBox
        Me.RBank = New System.Windows.Forms.RadioButton
        Me.btnGClose = New System.Windows.Forms.Button
        Me.btnGSave = New System.Windows.Forms.Button
        Me.GroupBox2 = New System.Windows.Forms.GroupBox
        Me.GroupBox4.SuspendLayout()
        Me.GroupBox3.SuspendLayout()
        Me.GroupBox6.SuspendLayout()
        Me.GroupBox1.SuspendLayout()
        Me.GroupBox2.SuspendLayout()
        Me.SuspendLayout()
        '
        'GroupBox4
        '
        Me.GroupBox4.Controls.Add(Me.Label3)
        Me.GroupBox4.Controls.Add(Me.txtWrittenValue)
        Me.GroupBox4.Controls.Add(Me.Label2)
        Me.GroupBox4.Controls.Add(Me.txtAmount)
        Me.GroupBox4.Location = New System.Drawing.Point(6, 175)
        Me.GroupBox4.Name = "GroupBox4"
        Me.GroupBox4.Size = New System.Drawing.Size(478, 77)
        Me.GroupBox4.TabIndex = 98
        Me.GroupBox4.TabStop = False
        Me.GroupBox4.Text = "المبلغ"
        '
        'Label3
        '
        Me.Label3.AutoSize = True
        Me.Label3.Location = New System.Drawing.Point(424, 47)
        Me.Label3.Name = "Label3"
        Me.Label3.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label3.Size = New System.Drawing.Size(36, 13)
        Me.Label3.TabIndex = 15
        Me.Label3.Text = "كتابتا :"
        '
        'txtWrittenValue
        '
        Me.txtWrittenValue.Location = New System.Drawing.Point(8, 43)
        Me.txtWrittenValue.Name = "txtWrittenValue"
        Me.txtWrittenValue.Size = New System.Drawing.Size(414, 20)
        Me.txtWrittenValue.TabIndex = 1
        '
        'Label2
        '
        Me.Label2.AutoSize = True
        Me.Label2.Location = New System.Drawing.Point(424, 21)
        Me.Label2.Name = "Label2"
        Me.Label2.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label2.Size = New System.Drawing.Size(41, 13)
        Me.Label2.TabIndex = 13
        Me.Label2.Text = "المبلغ :"
        '
        'txtAmount
        '
        Me.txtAmount.Location = New System.Drawing.Point(316, 17)
        Me.txtAmount.Name = "txtAmount"
        Me.txtAmount.Size = New System.Drawing.Size(106, 20)
        Me.txtAmount.TabIndex = 0
        Me.txtAmount.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'GroupBox3
        '
        Me.GroupBox3.Controls.Add(Me.CombAcc3)
        Me.GroupBox3.Controls.Add(Me.Label9)
        Me.GroupBox3.Controls.Add(Me.CombAcc2)
        Me.GroupBox3.Controls.Add(Me.Label6)
        Me.GroupBox3.Controls.Add(Me.CombPack)
        Me.GroupBox3.Controls.Add(Me.Label8)
        Me.GroupBox3.Location = New System.Drawing.Point(6, 4)
        Me.GroupBox3.Name = "GroupBox3"
        Me.GroupBox3.Size = New System.Drawing.Size(478, 75)
        Me.GroupBox3.TabIndex = 95
        Me.GroupBox3.TabStop = False
        Me.GroupBox3.Text = "الحساب"
        '
        'CombAcc3
        '
        Me.CombAcc3.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombAcc3.FormattingEnabled = True
        Me.CombAcc3.Location = New System.Drawing.Point(8, 44)
        Me.CombAcc3.Name = "CombAcc3"
        Me.CombAcc3.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.CombAcc3.Size = New System.Drawing.Size(149, 21)
        Me.CombAcc3.TabIndex = 2
        '
        'Label9
        '
        Me.Label9.AutoSize = True
        Me.Label9.Location = New System.Drawing.Point(159, 48)
        Me.Label9.Name = "Label9"
        Me.Label9.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label9.Size = New System.Drawing.Size(89, 13)
        Me.Label9.TabIndex = 10
        Me.Label9.Text = "الحساب الفرعي :"
        '
        'CombAcc2
        '
        Me.CombAcc2.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombAcc2.FormattingEnabled = True
        Me.CombAcc2.Location = New System.Drawing.Point(8, 17)
        Me.CombAcc2.Name = "CombAcc2"
        Me.CombAcc2.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.CombAcc2.Size = New System.Drawing.Size(149, 21)
        Me.CombAcc2.TabIndex = 1
        '
        'Label6
        '
        Me.Label6.AutoSize = True
        Me.Label6.Location = New System.Drawing.Point(159, 21)
        Me.Label6.Name = "Label6"
        Me.Label6.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label6.Size = New System.Drawing.Size(95, 13)
        Me.Label6.TabIndex = 8
        Me.Label6.Text = "الحساب الرئيسي :"
        '
        'CombPack
        '
        Me.CombPack.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombPack.FormattingEnabled = True
        Me.CombPack.Items.AddRange(New Object() {"تعويضات العاملين", "شراء السلع والخدمات", "أصول متداولة"})
        Me.CombPack.Location = New System.Drawing.Point(270, 17)
        Me.CombPack.Name = "CombPack"
        Me.CombPack.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.CombPack.Size = New System.Drawing.Size(154, 21)
        Me.CombPack.TabIndex = 0
        '
        'Label8
        '
        Me.Label8.AutoSize = True
        Me.Label8.Location = New System.Drawing.Point(426, 21)
        Me.Label8.Name = "Label8"
        Me.Label8.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label8.Size = New System.Drawing.Size(44, 13)
        Me.Label8.TabIndex = 4
        Me.Label8.Text = "الحزمة :"
        '
        'txtDescr
        '
        Me.txtDescr.Location = New System.Drawing.Point(8, 17)
        Me.txtDescr.Name = "txtDescr"
        Me.txtDescr.Size = New System.Drawing.Size(457, 20)
        Me.txtDescr.TabIndex = 0
        '
        'CombBank
        '
        Me.CombBank.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombBank.FormattingEnabled = True
        Me.CombBank.Location = New System.Drawing.Point(77, 45)
        Me.CombBank.Name = "CombBank"
        Me.CombBank.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.CombBank.Size = New System.Drawing.Size(149, 21)
        Me.CombBank.TabIndex = 3
        '
        'txtChNo
        '
        Me.txtChNo.Location = New System.Drawing.Point(153, 19)
        Me.txtChNo.Name = "txtChNo"
        Me.txtChNo.Size = New System.Drawing.Size(73, 20)
        Me.txtChNo.TabIndex = 2
        Me.txtChNo.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'GroupBox6
        '
        Me.GroupBox6.Controls.Add(Me.txtSource)
        Me.GroupBox6.Location = New System.Drawing.Point(6, 81)
        Me.GroupBox6.Name = "GroupBox6"
        Me.GroupBox6.Size = New System.Drawing.Size(478, 45)
        Me.GroupBox6.TabIndex = 96
        Me.GroupBox6.TabStop = False
        Me.GroupBox6.Text = "الجهة"
        '
        'txtSource
        '
        Me.txtSource.Location = New System.Drawing.Point(8, 17)
        Me.txtSource.Name = "txtSource"
        Me.txtSource.Size = New System.Drawing.Size(457, 20)
        Me.txtSource.TabIndex = 0
        '
        'GroupBox1
        '
        Me.GroupBox1.Controls.Add(Me.txtDescr)
        Me.GroupBox1.Location = New System.Drawing.Point(6, 128)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(478, 45)
        Me.GroupBox1.TabIndex = 97
        Me.GroupBox1.TabStop = False
        Me.GroupBox1.Text = "البيان"
        '
        'RCash
        '
        Me.RCash.AutoSize = True
        Me.RCash.Location = New System.Drawing.Point(383, 21)
        Me.RCash.Name = "RCash"
        Me.RCash.Size = New System.Drawing.Size(79, 17)
        Me.RCash.TabIndex = 0
        Me.RCash.TabStop = True
        Me.RCash.Text = "خزينة (نقدا)"
        Me.RCash.UseVisualStyleBackColor = True
        '
        'Button1
        '
        Me.Button1.Location = New System.Drawing.Point(208, 344)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 32)
        Me.Button1.TabIndex = 101
        Me.Button1.Text = "مسح"
        '
        'GroupBox5
        '
        Me.GroupBox5.Location = New System.Drawing.Point(6, 335)
        Me.GroupBox5.Name = "GroupBox5"
        Me.GroupBox5.Size = New System.Drawing.Size(478, 4)
        Me.GroupBox5.TabIndex = 103
        Me.GroupBox5.TabStop = False
        '
        'RBank
        '
        Me.RBank.AutoSize = True
        Me.RBank.Location = New System.Drawing.Point(228, 21)
        Me.RBank.Name = "RBank"
        Me.RBank.Size = New System.Drawing.Size(116, 17)
        Me.RBank.TabIndex = 1
        Me.RBank.TabStop = True
        Me.RBank.Text = "البنك - رقم الشيك :"
        Me.RBank.UseVisualStyleBackColor = True
        '
        'btnGClose
        '
        Me.btnGClose.Location = New System.Drawing.Point(74, 344)
        Me.btnGClose.Name = "btnGClose"
        Me.btnGClose.Size = New System.Drawing.Size(75, 32)
        Me.btnGClose.TabIndex = 102
        Me.btnGClose.Text = "إغلاق"
        '
        'btnGSave
        '
        Me.btnGSave.Location = New System.Drawing.Point(342, 344)
        Me.btnGSave.Name = "btnGSave"
        Me.btnGSave.Size = New System.Drawing.Size(75, 32)
        Me.btnGSave.TabIndex = 100
        Me.btnGSave.Text = "حفظ"
        '
        'GroupBox2
        '
        Me.GroupBox2.Controls.Add(Me.CombBank)
        Me.GroupBox2.Controls.Add(Me.txtChNo)
        Me.GroupBox2.Controls.Add(Me.RBank)
        Me.GroupBox2.Controls.Add(Me.RCash)
        Me.GroupBox2.Location = New System.Drawing.Point(6, 254)
        Me.GroupBox2.Name = "GroupBox2"
        Me.GroupBox2.Size = New System.Drawing.Size(478, 76)
        Me.GroupBox2.TabIndex = 99
        Me.GroupBox2.TabStop = False
        Me.GroupBox2.Text = "طريقة الدفع"
        '
        'frmPayBill
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(491, 380)
        Me.Controls.Add(Me.GroupBox4)
        Me.Controls.Add(Me.GroupBox3)
        Me.Controls.Add(Me.GroupBox6)
        Me.Controls.Add(Me.GroupBox1)
        Me.Controls.Add(Me.Button1)
        Me.Controls.Add(Me.GroupBox5)
        Me.Controls.Add(Me.btnGClose)
        Me.Controls.Add(Me.btnGSave)
        Me.Controls.Add(Me.GroupBox2)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MaximizeBox = False
        Me.Name = "frmPayBill"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.SizeGripStyle = System.Windows.Forms.SizeGripStyle.Hide
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "إصدار سند دفع"
        Me.GroupBox4.ResumeLayout(False)
        Me.GroupBox4.PerformLayout()
        Me.GroupBox3.ResumeLayout(False)
        Me.GroupBox3.PerformLayout()
        Me.GroupBox6.ResumeLayout(False)
        Me.GroupBox6.PerformLayout()
        Me.GroupBox1.ResumeLayout(False)
        Me.GroupBox1.PerformLayout()
        Me.GroupBox2.ResumeLayout(False)
        Me.GroupBox2.PerformLayout()
        Me.ResumeLayout(False)

    End Sub
    Friend WithEvents GroupBox4 As System.Windows.Forms.GroupBox
    Friend WithEvents Label3 As System.Windows.Forms.Label
    Friend WithEvents txtWrittenValue As System.Windows.Forms.TextBox
    Friend WithEvents Label2 As System.Windows.Forms.Label
    Friend WithEvents txtAmount As System.Windows.Forms.TextBox
    Friend WithEvents GroupBox3 As System.Windows.Forms.GroupBox
    Friend WithEvents CombAcc3 As System.Windows.Forms.ComboBox
    Friend WithEvents Label9 As System.Windows.Forms.Label
    Friend WithEvents CombAcc2 As System.Windows.Forms.ComboBox
    Friend WithEvents Label6 As System.Windows.Forms.Label
    Friend WithEvents CombPack As System.Windows.Forms.ComboBox
    Friend WithEvents Label8 As System.Windows.Forms.Label
    Friend WithEvents txtDescr As System.Windows.Forms.TextBox
    Friend WithEvents CombBank As System.Windows.Forms.ComboBox
    Friend WithEvents txtChNo As System.Windows.Forms.TextBox
    Friend WithEvents GroupBox6 As System.Windows.Forms.GroupBox
    Friend WithEvents txtSource As System.Windows.Forms.TextBox
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents RCash As System.Windows.Forms.RadioButton
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents GroupBox5 As System.Windows.Forms.GroupBox
    Friend WithEvents RBank As System.Windows.Forms.RadioButton
    Friend WithEvents btnGClose As System.Windows.Forms.Button
    Friend WithEvents btnGSave As System.Windows.Forms.Button
    Friend WithEvents GroupBox2 As System.Windows.Forms.GroupBox
End Class
