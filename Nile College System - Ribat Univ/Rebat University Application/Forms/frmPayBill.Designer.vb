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
        Me.components = New System.ComponentModel.Container
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmPayBill))
        Me.GroupBox3 = New System.Windows.Forms.GroupBox
        Me.txtDescr = New System.Windows.Forms.TextBox
        Me.Button2 = New System.Windows.Forms.Button
        Me.Button1 = New System.Windows.Forms.Button
        Me.GroupBox4 = New System.Windows.Forms.GroupBox
        Me.GroupBox99 = New System.Windows.Forms.GroupBox
        Me.txtWrittenAmount = New System.Windows.Forms.TextBox
        Me.Label6 = New System.Windows.Forms.Label
        Me.txtAmount = New System.Windows.Forms.TextBox
        Me.Label5 = New System.Windows.Forms.Label
        Me.GroupBox11 = New System.Windows.Forms.GroupBox
        Me.Label1 = New System.Windows.Forms.Label
        Me.CombAcc1 = New System.Windows.Forms.ComboBox
        Me.Label53 = New System.Windows.Forms.Label
        Me.CombAcc3 = New System.Windows.Forms.ComboBox
        Me.Label54 = New System.Windows.Forms.Label
        Me.CombAcc2 = New System.Windows.Forms.ComboBox
        Me.GroupBox1 = New System.Windows.Forms.GroupBox
        Me.CombCollege = New System.Windows.Forms.ComboBox
        Me.GroupBox6 = New System.Windows.Forms.GroupBox
        Me.txtCheqNo = New System.Windows.Forms.TextBox
        Me.Label4 = New System.Windows.Forms.Label
        Me.CombBank = New System.Windows.Forms.ComboBox
        Me.ErrProvider = New System.Windows.Forms.ErrorProvider(Me.components)
        Me.Button3 = New System.Windows.Forms.Button
        Me.GroupBox3.SuspendLayout()
        Me.GroupBox99.SuspendLayout()
        Me.GroupBox11.SuspendLayout()
        Me.GroupBox1.SuspendLayout()
        Me.GroupBox6.SuspendLayout()
        CType(Me.ErrProvider, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.SuspendLayout()
        '
        'GroupBox3
        '
        Me.GroupBox3.Controls.Add(Me.txtDescr)
        Me.GroupBox3.Location = New System.Drawing.Point(6, 129)
        Me.GroupBox3.Name = "GroupBox3"
        Me.GroupBox3.Size = New System.Drawing.Size(571, 45)
        Me.GroupBox3.TabIndex = 2
        Me.GroupBox3.TabStop = False
        Me.GroupBox3.Text = "البيان"
        '
        'txtDescr
        '
        Me.txtDescr.Location = New System.Drawing.Point(8, 19)
        Me.txtDescr.Name = "txtDescr"
        Me.txtDescr.Size = New System.Drawing.Size(539, 20)
        Me.txtDescr.TabIndex = 0
        '
        'Button2
        '
        Me.Button2.Location = New System.Drawing.Point(400, 320)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(75, 31)
        Me.Button2.TabIndex = 5
        Me.Button2.Text = "حفظ"
        Me.Button2.UseVisualStyleBackColor = True
        '
        'Button1
        '
        Me.Button1.Location = New System.Drawing.Point(107, 320)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 31)
        Me.Button1.TabIndex = 6
        Me.Button1.Text = "خروج"
        Me.Button1.UseVisualStyleBackColor = True
        '
        'GroupBox4
        '
        Me.GroupBox4.Location = New System.Drawing.Point(6, 305)
        Me.GroupBox4.Name = "GroupBox4"
        Me.GroupBox4.Size = New System.Drawing.Size(571, 8)
        Me.GroupBox4.TabIndex = 23
        Me.GroupBox4.TabStop = False
        '
        'GroupBox99
        '
        Me.GroupBox99.Controls.Add(Me.txtWrittenAmount)
        Me.GroupBox99.Controls.Add(Me.Label6)
        Me.GroupBox99.Controls.Add(Me.txtAmount)
        Me.GroupBox99.Controls.Add(Me.Label5)
        Me.GroupBox99.Location = New System.Drawing.Point(6, 177)
        Me.GroupBox99.Name = "GroupBox99"
        Me.GroupBox99.Size = New System.Drawing.Size(571, 73)
        Me.GroupBox99.TabIndex = 3
        Me.GroupBox99.TabStop = False
        Me.GroupBox99.Text = " مبلغ و قدره "
        '
        'txtWrittenAmount
        '
        Me.txtWrittenAmount.Location = New System.Drawing.Point(8, 45)
        Me.txtWrittenAmount.Name = "txtWrittenAmount"
        Me.txtWrittenAmount.Size = New System.Drawing.Size(491, 20)
        Me.txtWrittenAmount.TabIndex = 1
        '
        'Label6
        '
        Me.Label6.AutoSize = True
        Me.Label6.Location = New System.Drawing.Point(505, 48)
        Me.Label6.Name = "Label6"
        Me.Label6.Size = New System.Drawing.Size(50, 13)
        Me.Label6.TabIndex = 14
        Me.Label6.Text = "بالحروف :"
        Me.Label6.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'txtAmount
        '
        Me.txtAmount.Location = New System.Drawing.Point(379, 19)
        Me.txtAmount.Name = "txtAmount"
        Me.txtAmount.Size = New System.Drawing.Size(120, 20)
        Me.txtAmount.TabIndex = 0
        Me.txtAmount.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label5
        '
        Me.Label5.AutoSize = True
        Me.Label5.Location = New System.Drawing.Point(505, 22)
        Me.Label5.Name = "Label5"
        Me.Label5.Size = New System.Drawing.Size(46, 13)
        Me.Label5.TabIndex = 12
        Me.Label5.Text = "بالأرقام :"
        Me.Label5.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'GroupBox11
        '
        Me.GroupBox11.Controls.Add(Me.Label1)
        Me.GroupBox11.Controls.Add(Me.CombAcc1)
        Me.GroupBox11.Controls.Add(Me.Label53)
        Me.GroupBox11.Controls.Add(Me.CombAcc3)
        Me.GroupBox11.Controls.Add(Me.Label54)
        Me.GroupBox11.Controls.Add(Me.CombAcc2)
        Me.GroupBox11.Location = New System.Drawing.Point(6, 4)
        Me.GroupBox11.Name = "GroupBox11"
        Me.GroupBox11.Size = New System.Drawing.Size(571, 73)
        Me.GroupBox11.TabIndex = 0
        Me.GroupBox11.TabStop = False
        '
        'Label1
        '
        Me.Label1.AutoSize = True
        Me.Label1.Location = New System.Drawing.Point(509, 16)
        Me.Label1.Name = "Label1"
        Me.Label1.Size = New System.Drawing.Size(51, 13)
        Me.Label1.TabIndex = 81
        Me.Label1.Text = "الحساب :"
        '
        'CombAcc1
        '
        Me.CombAcc1.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombAcc1.FormattingEnabled = True
        Me.CombAcc1.Location = New System.Drawing.Point(307, 13)
        Me.CombAcc1.Name = "CombAcc1"
        Me.CombAcc1.Size = New System.Drawing.Size(196, 21)
        Me.CombAcc1.TabIndex = 0
        '
        'Label53
        '
        Me.Label53.AutoSize = True
        Me.Label53.Location = New System.Drawing.Point(210, 47)
        Me.Label53.Name = "Label53"
        Me.Label53.Size = New System.Drawing.Size(94, 13)
        Me.Label53.TabIndex = 79
        Me.Label53.Text = "الحسابات الفرعية :"
        '
        'CombAcc3
        '
        Me.CombAcc3.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombAcc3.FormattingEnabled = True
        Me.CombAcc3.Location = New System.Drawing.Point(8, 44)
        Me.CombAcc3.Name = "CombAcc3"
        Me.CombAcc3.Size = New System.Drawing.Size(196, 21)
        Me.CombAcc3.TabIndex = 2
        '
        'Label54
        '
        Me.Label54.AutoSize = True
        Me.Label54.Location = New System.Drawing.Point(509, 47)
        Me.Label54.Name = "Label54"
        Me.Label54.Size = New System.Drawing.Size(57, 13)
        Me.Label54.TabIndex = 76
        Me.Label54.Text = "الحسابات :"
        '
        'CombAcc2
        '
        Me.CombAcc2.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombAcc2.FormattingEnabled = True
        Me.CombAcc2.Location = New System.Drawing.Point(307, 44)
        Me.CombAcc2.Name = "CombAcc2"
        Me.CombAcc2.Size = New System.Drawing.Size(196, 21)
        Me.CombAcc2.TabIndex = 1
        '
        'GroupBox1
        '
        Me.GroupBox1.Controls.Add(Me.CombCollege)
        Me.GroupBox1.Location = New System.Drawing.Point(6, 80)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(571, 45)
        Me.GroupBox1.TabIndex = 1
        Me.GroupBox1.TabStop = False
        Me.GroupBox1.Text = "الكلية"
        '
        'CombCollege
        '
        Me.CombCollege.AutoCompleteCustomSource.AddRange(New String() {""})
        Me.CombCollege.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombCollege.ForeColor = System.Drawing.SystemColors.WindowText
        Me.CombCollege.FormattingEnabled = True
        Me.CombCollege.Location = New System.Drawing.Point(262, 18)
        Me.CombCollege.Name = "CombCollege"
        Me.CombCollege.Size = New System.Drawing.Size(285, 21)
        Me.CombCollege.TabIndex = 0
        '
        'GroupBox6
        '
        Me.GroupBox6.Controls.Add(Me.txtCheqNo)
        Me.GroupBox6.Controls.Add(Me.Label4)
        Me.GroupBox6.Controls.Add(Me.CombBank)
        Me.GroupBox6.Location = New System.Drawing.Point(6, 254)
        Me.GroupBox6.Name = "GroupBox6"
        Me.GroupBox6.Size = New System.Drawing.Size(571, 47)
        Me.GroupBox6.TabIndex = 4
        Me.GroupBox6.TabStop = False
        Me.GroupBox6.Text = "البنك"
        '
        'txtCheqNo
        '
        Me.txtCheqNo.Location = New System.Drawing.Point(8, 17)
        Me.txtCheqNo.Name = "txtCheqNo"
        Me.txtCheqNo.Size = New System.Drawing.Size(120, 20)
        Me.txtCheqNo.TabIndex = 1
        Me.txtCheqNo.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label4
        '
        Me.Label4.AutoSize = True
        Me.Label4.Location = New System.Drawing.Point(134, 20)
        Me.Label4.Name = "Label4"
        Me.Label4.Size = New System.Drawing.Size(108, 13)
        Me.Label4.TabIndex = 14
        Me.Label4.Text = "رقم الشيك / التوريدة :"
        Me.Label4.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'CombBank
        '
        Me.CombBank.AutoCompleteCustomSource.AddRange(New String() {""})
        Me.CombBank.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombBank.ForeColor = System.Drawing.SystemColors.WindowText
        Me.CombBank.FormattingEnabled = True
        Me.CombBank.Items.AddRange(New Object() {"كلية الطب", "كلية الصيدلة", "كلية علوم الحاسوب", "كلية القانون", "كلية الفنون"})
        Me.CombBank.Location = New System.Drawing.Point(262, 17)
        Me.CombBank.Name = "CombBank"
        Me.CombBank.Size = New System.Drawing.Size(285, 21)
        Me.CombBank.TabIndex = 0
        '
        'ErrProvider
        '
        Me.ErrProvider.ContainerControl = Me
        '
        'Button3
        '
        Me.Button3.Location = New System.Drawing.Point(251, 320)
        Me.Button3.Name = "Button3"
        Me.Button3.Size = New System.Drawing.Size(75, 31)
        Me.Button3.TabIndex = 24
        Me.Button3.Text = "مسح"
        Me.Button3.UseVisualStyleBackColor = True
        '
        'frmPayBill
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(583, 354)
        Me.Controls.Add(Me.Button3)
        Me.Controls.Add(Me.GroupBox6)
        Me.Controls.Add(Me.GroupBox1)
        Me.Controls.Add(Me.GroupBox11)
        Me.Controls.Add(Me.GroupBox3)
        Me.Controls.Add(Me.Button2)
        Me.Controls.Add(Me.Button1)
        Me.Controls.Add(Me.GroupBox4)
        Me.Controls.Add(Me.GroupBox99)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MaximizeBox = False
        Me.MaximumSize = New System.Drawing.Size(591, 388)
        Me.MinimumSize = New System.Drawing.Size(591, 388)
        Me.Name = "frmPayBill"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "إصدار سند دفع"
        Me.GroupBox3.ResumeLayout(False)
        Me.GroupBox3.PerformLayout()
        Me.GroupBox99.ResumeLayout(False)
        Me.GroupBox99.PerformLayout()
        Me.GroupBox11.ResumeLayout(False)
        Me.GroupBox11.PerformLayout()
        Me.GroupBox1.ResumeLayout(False)
        Me.GroupBox6.ResumeLayout(False)
        Me.GroupBox6.PerformLayout()
        CType(Me.ErrProvider, System.ComponentModel.ISupportInitialize).EndInit()
        Me.ResumeLayout(False)

    End Sub
    Friend WithEvents GroupBox3 As System.Windows.Forms.GroupBox
    Friend WithEvents txtDescr As System.Windows.Forms.TextBox
    Friend WithEvents Button2 As System.Windows.Forms.Button
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents GroupBox4 As System.Windows.Forms.GroupBox
    Friend WithEvents GroupBox99 As System.Windows.Forms.GroupBox
    Friend WithEvents txtWrittenAmount As System.Windows.Forms.TextBox
    Friend WithEvents Label6 As System.Windows.Forms.Label
    Friend WithEvents txtAmount As System.Windows.Forms.TextBox
    Friend WithEvents Label5 As System.Windows.Forms.Label
    Friend WithEvents GroupBox11 As System.Windows.Forms.GroupBox
    Friend WithEvents Label53 As System.Windows.Forms.Label
    Friend WithEvents CombAcc3 As System.Windows.Forms.ComboBox
    Friend WithEvents Label54 As System.Windows.Forms.Label
    Friend WithEvents CombAcc2 As System.Windows.Forms.ComboBox
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents CombCollege As System.Windows.Forms.ComboBox
    Friend WithEvents GroupBox6 As System.Windows.Forms.GroupBox
    Friend WithEvents txtCheqNo As System.Windows.Forms.TextBox
    Friend WithEvents Label4 As System.Windows.Forms.Label
    Friend WithEvents CombBank As System.Windows.Forms.ComboBox
    Friend WithEvents ErrProvider As System.Windows.Forms.ErrorProvider
    Friend WithEvents Button3 As System.Windows.Forms.Button
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents CombAcc1 As System.Windows.Forms.ComboBox
End Class
