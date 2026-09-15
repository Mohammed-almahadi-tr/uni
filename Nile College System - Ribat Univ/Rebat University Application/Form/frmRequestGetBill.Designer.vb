<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frmRequestGetBill
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
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmRequestGetBill))
        Me.GroupBox1 = New System.Windows.Forms.GroupBox
        Me.Button4 = New System.Windows.Forms.Button
        Me.txtBatch = New System.Windows.Forms.TextBox
        Me.txtStudName = New System.Windows.Forms.TextBox
        Me.txtCollege = New System.Windows.Forms.TextBox
        Me.Label2 = New System.Windows.Forms.Label
        Me.Label1 = New System.Windows.Forms.Label
        Me.txtStudID = New System.Windows.Forms.TextBox
        Me.Label14 = New System.Windows.Forms.Label
        Me.Label15 = New System.Windows.Forms.Label
        Me.Button3 = New System.Windows.Forms.Button
        Me.Button2 = New System.Windows.Forms.Button
        Me.Button1 = New System.Windows.Forms.Button
        Me.GroupBox4 = New System.Windows.Forms.GroupBox
        Me.ErrProvider = New System.Windows.Forms.ErrorProvider(Me.components)
        Me.GroupBox2 = New System.Windows.Forms.GroupBox
        Me.CombAcdYear = New System.Windows.Forms.ComboBox
        Me.Label7 = New System.Windows.Forms.Label
        Me.CombSems = New System.Windows.Forms.ComboBox
        Me.Label13 = New System.Windows.Forms.Label
        Me.GroupBox99 = New System.Windows.Forms.GroupBox
        Me.Label10 = New System.Windows.Forms.Label
        Me.txtStam = New System.Windows.Forms.TextBox
        Me.txtAmountTotalWr = New System.Windows.Forms.TextBox
        Me.Label3 = New System.Windows.Forms.Label
        Me.txtAmountTotal = New System.Windows.Forms.TextBox
        Me.Label16 = New System.Windows.Forms.Label
        Me.txtAmountReg = New System.Windows.Forms.TextBox
        Me.Label9 = New System.Windows.Forms.Label
        Me.txtAmountTusion = New System.Windows.Forms.TextBox
        Me.Label5 = New System.Windows.Forms.Label
        Me.GroupBox1.SuspendLayout()
        CType(Me.ErrProvider, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.GroupBox2.SuspendLayout()
        Me.GroupBox99.SuspendLayout()
        Me.SuspendLayout()
        '
        'GroupBox1
        '
        Me.GroupBox1.Controls.Add(Me.Button4)
        Me.GroupBox1.Controls.Add(Me.txtBatch)
        Me.GroupBox1.Controls.Add(Me.txtStudName)
        Me.GroupBox1.Controls.Add(Me.txtCollege)
        Me.GroupBox1.Controls.Add(Me.Label2)
        Me.GroupBox1.Controls.Add(Me.Label1)
        Me.GroupBox1.Controls.Add(Me.txtStudID)
        Me.GroupBox1.Controls.Add(Me.Label14)
        Me.GroupBox1.Controls.Add(Me.Label15)
        Me.GroupBox1.Location = New System.Drawing.Point(5, 4)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(559, 71)
        Me.GroupBox1.TabIndex = 0
        Me.GroupBox1.TabStop = False
        Me.GroupBox1.Text = "الطالب"
        '
        'Button4
        '
        Me.Button4.Location = New System.Drawing.Point(6, 13)
        Me.Button4.Name = "Button4"
        Me.Button4.Size = New System.Drawing.Size(30, 24)
        Me.Button4.TabIndex = 27
        Me.Button4.Text = "...."
        Me.Button4.UseVisualStyleBackColor = True
        '
        'txtBatch
        '
        Me.txtBatch.Location = New System.Drawing.Point(181, 45)
        Me.txtBatch.Name = "txtBatch"
        Me.txtBatch.ReadOnly = True
        Me.txtBatch.Size = New System.Drawing.Size(103, 20)
        Me.txtBatch.TabIndex = 3
        Me.txtBatch.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'txtStudName
        '
        Me.txtStudName.Location = New System.Drawing.Point(42, 16)
        Me.txtStudName.Name = "txtStudName"
        Me.txtStudName.ReadOnly = True
        Me.txtStudName.Size = New System.Drawing.Size(242, 20)
        Me.txtStudName.TabIndex = 1
        '
        'txtCollege
        '
        Me.txtCollege.Location = New System.Drawing.Point(347, 45)
        Me.txtCollege.Name = "txtCollege"
        Me.txtCollege.ReadOnly = True
        Me.txtCollege.Size = New System.Drawing.Size(139, 20)
        Me.txtCollege.TabIndex = 2
        Me.txtCollege.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label2
        '
        Me.Label2.AutoSize = True
        Me.Label2.Location = New System.Drawing.Point(290, 48)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(43, 13)
        Me.Label2.TabIndex = 4
        Me.Label2.Text = "الدفعة :"
        '
        'Label1
        '
        Me.Label1.AutoSize = True
        Me.Label1.Location = New System.Drawing.Point(291, 18)
        Me.Label1.Name = "Label1"
        Me.Label1.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label1.Size = New System.Drawing.Size(43, 13)
        Me.Label1.TabIndex = 0
        Me.Label1.Text = "الإسم :"
        '
        'txtStudID
        '
        Me.txtStudID.Location = New System.Drawing.Point(347, 16)
        Me.txtStudID.Name = "txtStudID"
        Me.txtStudID.Size = New System.Drawing.Size(139, 20)
        Me.txtStudID.TabIndex = 0
        Me.txtStudID.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label14
        '
        Me.Label14.AutoSize = True
        Me.Label14.Location = New System.Drawing.Point(492, 18)
        Me.Label14.Name = "Label14"
        Me.Label14.Size = New System.Drawing.Size(38, 13)
        Me.Label14.TabIndex = 24
        Me.Label14.Text = "الرقم :"
        Me.Label14.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label15
        '
        Me.Label15.AutoSize = True
        Me.Label15.Location = New System.Drawing.Point(492, 48)
        Me.Label15.Name = "Label15"
        Me.Label15.Size = New System.Drawing.Size(40, 13)
        Me.Label15.TabIndex = 2
        Me.Label15.Text = "الكلية :"
        '
        'Button3
        '
        Me.Button3.Location = New System.Drawing.Point(248, 299)
        Me.Button3.Name = "Button3"
        Me.Button3.Size = New System.Drawing.Size(75, 31)
        Me.Button3.TabIndex = 4
        Me.Button3.Text = "مسح"
        Me.Button3.UseVisualStyleBackColor = True
        '
        'Button2
        '
        Me.Button2.Location = New System.Drawing.Point(394, 299)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(75, 31)
        Me.Button2.TabIndex = 3
        Me.Button2.Text = "حفظ"
        Me.Button2.UseVisualStyleBackColor = True
        '
        'Button1
        '
        Me.Button1.Location = New System.Drawing.Point(102, 299)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 31)
        Me.Button1.TabIndex = 5
        Me.Button1.Text = "خروج"
        Me.Button1.UseVisualStyleBackColor = True
        '
        'GroupBox4
        '
        Me.GroupBox4.Location = New System.Drawing.Point(6, 285)
        Me.GroupBox4.Name = "GroupBox4"
        Me.GroupBox4.Size = New System.Drawing.Size(559, 8)
        Me.GroupBox4.TabIndex = 34
        Me.GroupBox4.TabStop = False
        '
        'ErrProvider
        '
        Me.ErrProvider.ContainerControl = Me
        '
        'GroupBox2
        '
        Me.GroupBox2.Controls.Add(Me.CombAcdYear)
        Me.GroupBox2.Controls.Add(Me.Label7)
        Me.GroupBox2.Controls.Add(Me.CombSems)
        Me.GroupBox2.Controls.Add(Me.Label13)
        Me.GroupBox2.Location = New System.Drawing.Point(5, 78)
        Me.GroupBox2.Name = "GroupBox2"
        Me.GroupBox2.Size = New System.Drawing.Size(559, 46)
        Me.GroupBox2.TabIndex = 1
        Me.GroupBox2.TabStop = False
        Me.GroupBox2.Text = "البيانات"
        '
        'CombAcdYear
        '
        Me.CombAcdYear.AutoCompleteCustomSource.AddRange(New String() {""})
        Me.CombAcdYear.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombAcdYear.ForeColor = System.Drawing.SystemColors.WindowText
        Me.CombAcdYear.FormattingEnabled = True
        Me.CombAcdYear.Items.AddRange(New Object() {"الفصل الدراسي الأول", "الفصل الدراسي الثاني"})
        Me.CombAcdYear.Location = New System.Drawing.Point(347, 15)
        Me.CombAcdYear.Name = "CombAcdYear"
        Me.CombAcdYear.Size = New System.Drawing.Size(121, 21)
        Me.CombAcdYear.TabIndex = 0
        '
        'Label7
        '
        Me.Label7.AutoSize = True
        Me.Label7.Location = New System.Drawing.Point(474, 18)
        Me.Label7.Name = "Label7"
        Me.Label7.Size = New System.Drawing.Size(36, 13)
        Me.Label7.TabIndex = 14
        Me.Label7.Text = "العام :"
        Me.Label7.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'CombSems
        '
        Me.CombSems.AutoCompleteCustomSource.AddRange(New String() {""})
        Me.CombSems.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombSems.ForeColor = System.Drawing.SystemColors.WindowText
        Me.CombSems.FormattingEnabled = True
        Me.CombSems.Items.AddRange(New Object() {"الفصل الدراسي الأول", "الفصل الدراسي الثاني"})
        Me.CombSems.Location = New System.Drawing.Point(42, 15)
        Me.CombSems.Name = "CombSems"
        Me.CombSems.Size = New System.Drawing.Size(155, 21)
        Me.CombSems.TabIndex = 1
        '
        'Label13
        '
        Me.Label13.AutoSize = True
        Me.Label13.Location = New System.Drawing.Point(203, 18)
        Me.Label13.Name = "Label13"
        Me.Label13.Size = New System.Drawing.Size(87, 13)
        Me.Label13.TabIndex = 6
        Me.Label13.Text = "الفصل الدراسي :"
        '
        'GroupBox99
        '
        Me.GroupBox99.Controls.Add(Me.Label10)
        Me.GroupBox99.Controls.Add(Me.txtStam)
        Me.GroupBox99.Controls.Add(Me.txtAmountTotalWr)
        Me.GroupBox99.Controls.Add(Me.Label3)
        Me.GroupBox99.Controls.Add(Me.txtAmountTotal)
        Me.GroupBox99.Controls.Add(Me.Label16)
        Me.GroupBox99.Controls.Add(Me.txtAmountReg)
        Me.GroupBox99.Controls.Add(Me.Label9)
        Me.GroupBox99.Controls.Add(Me.txtAmountTusion)
        Me.GroupBox99.Controls.Add(Me.Label5)
        Me.GroupBox99.Location = New System.Drawing.Point(5, 128)
        Me.GroupBox99.Name = "GroupBox99"
        Me.GroupBox99.Size = New System.Drawing.Size(559, 154)
        Me.GroupBox99.TabIndex = 2
        Me.GroupBox99.TabStop = False
        Me.GroupBox99.Text = " مبلغ و قدره :"
        '
        'Label10
        '
        Me.Label10.AutoSize = True
        Me.Label10.Location = New System.Drawing.Point(113, 48)
        Me.Label10.Name = "Label10"
        Me.Label10.Size = New System.Drawing.Size(44, 13)
        Me.Label10.TabIndex = 28
        Me.Label10.Text = "الدمغة :"
        '
        'txtStam
        '
        Me.txtStam.Location = New System.Drawing.Point(26, 44)
        Me.txtStam.Name = "txtStam"
        Me.txtStam.Size = New System.Drawing.Size(81, 20)
        Me.txtStam.TabIndex = 2
        Me.txtStam.Text = "0.50"
        Me.txtStam.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'txtAmountTotalWr
        '
        Me.txtAmountTotalWr.BackColor = System.Drawing.Color.Black
        Me.txtAmountTotalWr.ForeColor = System.Drawing.Color.LawnGreen
        Me.txtAmountTotalWr.Location = New System.Drawing.Point(3, 109)
        Me.txtAmountTotalWr.Multiline = True
        Me.txtAmountTotalWr.Name = "txtAmountTotalWr"
        Me.txtAmountTotalWr.ReadOnly = True
        Me.txtAmountTotalWr.Size = New System.Drawing.Size(285, 39)
        Me.txtAmountTotalWr.TabIndex = 9
        '
        'Label3
        '
        Me.Label3.AutoSize = True
        Me.Label3.Location = New System.Drawing.Point(291, 111)
        Me.Label3.Name = "Label3"
        Me.Label3.Size = New System.Drawing.Size(50, 13)
        Me.Label3.TabIndex = 26
        Me.Label3.Text = "بالحروف :"
        Me.Label3.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'txtAmountTotal
        '
        Me.txtAmountTotal.BackColor = System.Drawing.Color.Black
        Me.txtAmountTotal.ForeColor = System.Drawing.Color.LawnGreen
        Me.txtAmountTotal.Location = New System.Drawing.Point(346, 109)
        Me.txtAmountTotal.Name = "txtAmountTotal"
        Me.txtAmountTotal.ReadOnly = True
        Me.txtAmountTotal.Size = New System.Drawing.Size(81, 20)
        Me.txtAmountTotal.TabIndex = 8
        Me.txtAmountTotal.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label16
        '
        Me.Label16.AutoSize = True
        Me.Label16.Location = New System.Drawing.Point(433, 111)
        Me.Label16.Name = "Label16"
        Me.Label16.Size = New System.Drawing.Size(53, 13)
        Me.Label16.TabIndex = 25
        Me.Label16.Text = "المجموع :"
        Me.Label16.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'txtAmountReg
        '
        Me.txtAmountReg.Location = New System.Drawing.Point(167, 44)
        Me.txtAmountReg.Name = "txtAmountReg"
        Me.txtAmountReg.Size = New System.Drawing.Size(81, 20)
        Me.txtAmountReg.TabIndex = 1
        Me.txtAmountReg.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label9
        '
        Me.Label9.AutoSize = True
        Me.Label9.Location = New System.Drawing.Point(254, 47)
        Me.Label9.Name = "Label9"
        Me.Label9.Size = New System.Drawing.Size(85, 13)
        Me.Label9.TabIndex = 17
        Me.Label9.Text = "رسوم التسجيل :"
        Me.Label9.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'txtAmountTusion
        '
        Me.txtAmountTusion.Location = New System.Drawing.Point(346, 44)
        Me.txtAmountTusion.Name = "txtAmountTusion"
        Me.txtAmountTusion.Size = New System.Drawing.Size(81, 20)
        Me.txtAmountTusion.TabIndex = 0
        Me.txtAmountTusion.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label5
        '
        Me.Label5.AutoSize = True
        Me.Label5.Location = New System.Drawing.Point(433, 48)
        Me.Label5.Name = "Label5"
        Me.Label5.Size = New System.Drawing.Size(91, 13)
        Me.Label5.TabIndex = 12
        Me.Label5.Text = "الرسوم الدراسية :"
        Me.Label5.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'frmRequestGetBill
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(562, 331)
        Me.Controls.Add(Me.GroupBox99)
        Me.Controls.Add(Me.GroupBox2)
        Me.Controls.Add(Me.Button3)
        Me.Controls.Add(Me.Button2)
        Me.Controls.Add(Me.Button1)
        Me.Controls.Add(Me.GroupBox4)
        Me.Controls.Add(Me.GroupBox1)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MaximizeBox = False
        Me.MaximumSize = New System.Drawing.Size(578, 369)
        Me.MinimumSize = New System.Drawing.Size(578, 369)
        Me.Name = "frmRequestGetBill"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "إصدار إذن إستلام مبلغ"
        Me.GroupBox1.ResumeLayout(False)
        Me.GroupBox1.PerformLayout()
        CType(Me.ErrProvider, System.ComponentModel.ISupportInitialize).EndInit()
        Me.GroupBox2.ResumeLayout(False)
        Me.GroupBox2.PerformLayout()
        Me.GroupBox99.ResumeLayout(False)
        Me.GroupBox99.PerformLayout()
        Me.ResumeLayout(False)

    End Sub
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents Button4 As System.Windows.Forms.Button
    Friend WithEvents txtBatch As System.Windows.Forms.TextBox
    Friend WithEvents txtStudName As System.Windows.Forms.TextBox
    Friend WithEvents txtCollege As System.Windows.Forms.TextBox
    Friend WithEvents Label2 As System.Windows.Forms.Label
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents txtStudID As System.Windows.Forms.TextBox
    Friend WithEvents Label14 As System.Windows.Forms.Label
    Friend WithEvents Label15 As System.Windows.Forms.Label
    Friend WithEvents Button3 As System.Windows.Forms.Button
    Friend WithEvents Button2 As System.Windows.Forms.Button
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents GroupBox4 As System.Windows.Forms.GroupBox
    Friend WithEvents ErrProvider As System.Windows.Forms.ErrorProvider
    Friend WithEvents GroupBox2 As System.Windows.Forms.GroupBox
    Friend WithEvents CombAcdYear As System.Windows.Forms.ComboBox
    Friend WithEvents Label7 As System.Windows.Forms.Label
    Friend WithEvents CombSems As System.Windows.Forms.ComboBox
    Friend WithEvents Label13 As System.Windows.Forms.Label
    Friend WithEvents GroupBox99 As System.Windows.Forms.GroupBox
    Friend WithEvents Label10 As System.Windows.Forms.Label
    Friend WithEvents txtStam As System.Windows.Forms.TextBox
    Friend WithEvents txtAmountTotalWr As System.Windows.Forms.TextBox
    Friend WithEvents Label3 As System.Windows.Forms.Label
    Friend WithEvents txtAmountTotal As System.Windows.Forms.TextBox
    Friend WithEvents Label16 As System.Windows.Forms.Label
    Friend WithEvents txtAmountReg As System.Windows.Forms.TextBox
    Friend WithEvents Label9 As System.Windows.Forms.Label
    Friend WithEvents txtAmountTusion As System.Windows.Forms.TextBox
    Friend WithEvents Label5 As System.Windows.Forms.Label
End Class
