<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frmStdReg
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
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmStdReg))
        Me.Label1 = New System.Windows.Forms.Label
        Me.CombCollege = New System.Windows.Forms.ComboBox
        Me.GroupBox1 = New System.Windows.Forms.GroupBox
        Me.txtFixedFees = New System.Windows.Forms.TextBox
        Me.Label10 = New System.Windows.Forms.Label
        Me.txtName = New System.Windows.Forms.TextBox
        Me.txtTele = New System.Windows.Forms.TextBox
        Me.Label11 = New System.Windows.Forms.Label
        Me.CombBatch = New System.Windows.Forms.ComboBox
        Me.Label13 = New System.Windows.Forms.Label
        Me.Label3 = New System.Windows.Forms.Label
        Me.Label6 = New System.Windows.Forms.Label
        Me.txtAdderess = New System.Windows.Forms.TextBox
        Me.GroupBox4 = New System.Windows.Forms.GroupBox
        Me.Button1 = New System.Windows.Forms.Button
        Me.Button2 = New System.Windows.Forms.Button
        Me.Button3 = New System.Windows.Forms.Button
        Me.ErrProvider = New System.Windows.Forms.ErrorProvider(Me.components)
        Me.GroupBox2 = New System.Windows.Forms.GroupBox
        Me.Label9 = New System.Windows.Forms.Label
        Me.txtDiscDescr = New System.Windows.Forms.TextBox
        Me.Label8 = New System.Windows.Forms.Label
        Me.txtTuitionFees = New System.Windows.Forms.TextBox
        Me.btnDept = New System.Windows.Forms.Button
        Me.txtDiscountPerc = New System.Windows.Forms.TextBox
        Me.CombAcdYear = New System.Windows.Forms.ComboBox
        Me.Label7 = New System.Windows.Forms.Label
        Me.Label2 = New System.Windows.Forms.Label
        Me.Label4 = New System.Windows.Forms.Label
        Me.Label5 = New System.Windows.Forms.Label
        Me.txtRegFees = New System.Windows.Forms.TextBox
        Me.GroupBox1.SuspendLayout()
        CType(Me.ErrProvider, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.GroupBox2.SuspendLayout()
        Me.SuspendLayout()
        '
        'Label1
        '
        Me.Label1.AutoSize = True
        Me.Label1.Location = New System.Drawing.Point(553, 43)
        Me.Label1.Name = "Label1"
        Me.Label1.Size = New System.Drawing.Size(40, 13)
        Me.Label1.TabIndex = 0
        Me.Label1.Text = "الكلية :"
        '
        'CombCollege
        '
        Me.CombCollege.AutoCompleteCustomSource.AddRange(New String() {""})
        Me.CombCollege.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombCollege.ForeColor = System.Drawing.SystemColors.WindowText
        Me.CombCollege.FormattingEnabled = True
        Me.CombCollege.Location = New System.Drawing.Point(292, 40)
        Me.CombCollege.Name = "CombCollege"
        Me.CombCollege.Size = New System.Drawing.Size(255, 21)
        Me.CombCollege.TabIndex = 1
        '
        'GroupBox1
        '
        Me.GroupBox1.Controls.Add(Me.txtFixedFees)
        Me.GroupBox1.Controls.Add(Me.Label10)
        Me.GroupBox1.Controls.Add(Me.txtName)
        Me.GroupBox1.Controls.Add(Me.txtTele)
        Me.GroupBox1.Controls.Add(Me.Label11)
        Me.GroupBox1.Controls.Add(Me.CombBatch)
        Me.GroupBox1.Controls.Add(Me.Label13)
        Me.GroupBox1.Controls.Add(Me.Label1)
        Me.GroupBox1.Controls.Add(Me.Label3)
        Me.GroupBox1.Controls.Add(Me.Label6)
        Me.GroupBox1.Controls.Add(Me.CombCollege)
        Me.GroupBox1.Controls.Add(Me.txtAdderess)
        Me.GroupBox1.Location = New System.Drawing.Point(7, 2)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(635, 161)
        Me.GroupBox1.TabIndex = 0
        Me.GroupBox1.TabStop = False
        '
        'txtFixedFees
        '
        Me.txtFixedFees.Location = New System.Drawing.Point(113, 67)
        Me.txtFixedFees.Name = "txtFixedFees"
        Me.txtFixedFees.ReadOnly = True
        Me.txtFixedFees.Size = New System.Drawing.Size(121, 20)
        Me.txtFixedFees.TabIndex = 37
        Me.txtFixedFees.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label10
        '
        Me.Label10.AutoSize = True
        Me.Label10.Location = New System.Drawing.Point(240, 71)
        Me.Label10.Name = "Label10"
        Me.Label10.Size = New System.Drawing.Size(84, 13)
        Me.Label10.TabIndex = 38
        Me.Label10.Text = "الرسوم المقررة :"
        '
        'txtName
        '
        Me.txtName.Location = New System.Drawing.Point(292, 14)
        Me.txtName.Name = "txtName"
        Me.txtName.Size = New System.Drawing.Size(255, 20)
        Me.txtName.TabIndex = 0
        '
        'txtTele
        '
        Me.txtTele.Location = New System.Drawing.Point(405, 67)
        Me.txtTele.Name = "txtTele"
        Me.txtTele.Size = New System.Drawing.Size(142, 20)
        Me.txtTele.TabIndex = 3
        '
        'Label11
        '
        Me.Label11.AutoSize = True
        Me.Label11.Location = New System.Drawing.Point(553, 70)
        Me.Label11.Name = "Label11"
        Me.Label11.Size = New System.Drawing.Size(66, 13)
        Me.Label11.TabIndex = 19
        Me.Label11.Text = "رقم التلفون :"
        '
        'CombBatch
        '
        Me.CombBatch.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombBatch.FormattingEnabled = True
        Me.CombBatch.Location = New System.Drawing.Point(113, 40)
        Me.CombBatch.Name = "CombBatch"
        Me.CombBatch.Size = New System.Drawing.Size(121, 21)
        Me.CombBatch.TabIndex = 2
        '
        'Label13
        '
        Me.Label13.AutoSize = True
        Me.Label13.Location = New System.Drawing.Point(240, 43)
        Me.Label13.Name = "Label13"
        Me.Label13.Size = New System.Drawing.Size(43, 13)
        Me.Label13.TabIndex = 7
        Me.Label13.Text = "الدفعه :"
        '
        'Label3
        '
        Me.Label3.AutoSize = True
        Me.Label3.Location = New System.Drawing.Point(553, 17)
        Me.Label3.Name = "Label3"
        Me.Label3.Size = New System.Drawing.Size(76, 13)
        Me.Label3.TabIndex = 5
        Me.Label3.Text = "الإسم الطالب :"
        '
        'Label6
        '
        Me.Label6.AutoSize = True
        Me.Label6.Location = New System.Drawing.Point(553, 96)
        Me.Label6.Name = "Label6"
        Me.Label6.Size = New System.Drawing.Size(45, 13)
        Me.Label6.TabIndex = 12
        Me.Label6.Text = "العنوان :"
        '
        'txtAdderess
        '
        Me.txtAdderess.Location = New System.Drawing.Point(113, 93)
        Me.txtAdderess.Multiline = True
        Me.txtAdderess.Name = "txtAdderess"
        Me.txtAdderess.Size = New System.Drawing.Size(434, 59)
        Me.txtAdderess.TabIndex = 4
        '
        'GroupBox4
        '
        Me.GroupBox4.Location = New System.Drawing.Point(7, 235)
        Me.GroupBox4.Name = "GroupBox4"
        Me.GroupBox4.Size = New System.Drawing.Size(635, 8)
        Me.GroupBox4.TabIndex = 15
        Me.GroupBox4.TabStop = False
        '
        'Button1
        '
        Me.Button1.Location = New System.Drawing.Point(123, 250)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 31)
        Me.Button1.TabIndex = 4
        Me.Button1.Text = "خروج"
        Me.Button1.UseVisualStyleBackColor = True
        '
        'Button2
        '
        Me.Button2.Location = New System.Drawing.Point(451, 250)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(75, 31)
        Me.Button2.TabIndex = 2
        Me.Button2.Text = "حفظ"
        Me.Button2.UseVisualStyleBackColor = True
        '
        'Button3
        '
        Me.Button3.Location = New System.Drawing.Point(287, 250)
        Me.Button3.Name = "Button3"
        Me.Button3.Size = New System.Drawing.Size(75, 31)
        Me.Button3.TabIndex = 3
        Me.Button3.Text = "مسح"
        Me.Button3.UseVisualStyleBackColor = True
        '
        'ErrProvider
        '
        Me.ErrProvider.ContainerControl = Me
        '
        'GroupBox2
        '
        Me.GroupBox2.Controls.Add(Me.Label9)
        Me.GroupBox2.Controls.Add(Me.txtDiscDescr)
        Me.GroupBox2.Controls.Add(Me.Label8)
        Me.GroupBox2.Controls.Add(Me.txtTuitionFees)
        Me.GroupBox2.Controls.Add(Me.btnDept)
        Me.GroupBox2.Controls.Add(Me.txtDiscountPerc)
        Me.GroupBox2.Controls.Add(Me.CombAcdYear)
        Me.GroupBox2.Controls.Add(Me.Label7)
        Me.GroupBox2.Controls.Add(Me.Label2)
        Me.GroupBox2.Controls.Add(Me.Label4)
        Me.GroupBox2.Controls.Add(Me.Label5)
        Me.GroupBox2.Controls.Add(Me.txtRegFees)
        Me.GroupBox2.Location = New System.Drawing.Point(7, 166)
        Me.GroupBox2.Name = "GroupBox2"
        Me.GroupBox2.Size = New System.Drawing.Size(635, 66)
        Me.GroupBox2.TabIndex = 1
        Me.GroupBox2.TabStop = False
        Me.GroupBox2.Text = "رسوم الطالب"
        '
        'Label9
        '
        Me.Label9.AutoSize = True
        Me.Label9.Location = New System.Drawing.Point(341, 17)
        Me.Label9.Name = "Label9"
        Me.Label9.Size = New System.Drawing.Size(82, 13)
        Me.Label9.TabIndex = 41
        Me.Label9.Text = "سبب التخفيض :"
        '
        'txtDiscDescr
        '
        Me.txtDiscDescr.Location = New System.Drawing.Point(48, 13)
        Me.txtDiscDescr.Name = "txtDiscDescr"
        Me.txtDiscDescr.Size = New System.Drawing.Size(287, 20)
        Me.txtDiscDescr.TabIndex = 1
        '
        'Label8
        '
        Me.Label8.AutoSize = True
        Me.Label8.Location = New System.Drawing.Point(466, 16)
        Me.Label8.Name = "Label8"
        Me.Label8.Size = New System.Drawing.Size(18, 13)
        Me.Label8.TabIndex = 39
        Me.Label8.Text = "%"
        '
        'txtTuitionFees
        '
        Me.txtTuitionFees.Location = New System.Drawing.Point(434, 38)
        Me.txtTuitionFees.Name = "txtTuitionFees"
        Me.txtTuitionFees.Size = New System.Drawing.Size(103, 20)
        Me.txtTuitionFees.TabIndex = 2
        Me.txtTuitionFees.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'btnDept
        '
        Me.btnDept.Location = New System.Drawing.Point(7, 38)
        Me.btnDept.Name = "btnDept"
        Me.btnDept.Size = New System.Drawing.Size(35, 23)
        Me.btnDept.TabIndex = 5
        Me.btnDept.Text = "+"
        Me.btnDept.UseVisualStyleBackColor = True
        '
        'txtDiscountPerc
        '
        Me.txtDiscountPerc.Location = New System.Drawing.Point(490, 12)
        Me.txtDiscountPerc.Name = "txtDiscountPerc"
        Me.txtDiscountPerc.Size = New System.Drawing.Size(47, 20)
        Me.txtDiscountPerc.TabIndex = 0
        Me.txtDiscountPerc.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'CombAcdYear
        '
        Me.CombAcdYear.AutoCompleteCustomSource.AddRange(New String() {""})
        Me.CombAcdYear.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombAcdYear.ForeColor = System.Drawing.SystemColors.WindowText
        Me.CombAcdYear.FormattingEnabled = True
        Me.CombAcdYear.Items.AddRange(New Object() {"الفصل الدراسي الأول", "الفصل الدراسي الثاني"})
        Me.CombAcdYear.Location = New System.Drawing.Point(48, 39)
        Me.CombAcdYear.Name = "CombAcdYear"
        Me.CombAcdYear.Size = New System.Drawing.Size(120, 21)
        Me.CombAcdYear.TabIndex = 4
        '
        'Label7
        '
        Me.Label7.AutoSize = True
        Me.Label7.Location = New System.Drawing.Point(174, 43)
        Me.Label7.Name = "Label7"
        Me.Label7.Size = New System.Drawing.Size(36, 13)
        Me.Label7.TabIndex = 28
        Me.Label7.Text = "العام :"
        Me.Label7.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label2
        '
        Me.Label2.AutoSize = True
        Me.Label2.Location = New System.Drawing.Point(543, 16)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(79, 13)
        Me.Label2.TabIndex = 38
        Me.Label2.Text = "نسبة التسديد :"
        '
        'Label4
        '
        Me.Label4.AutoSize = True
        Me.Label4.Location = New System.Drawing.Point(543, 42)
        Me.Label4.Name = "Label4"
        Me.Label4.Size = New System.Drawing.Size(91, 13)
        Me.Label4.TabIndex = 31
        Me.Label4.Text = "الرسوم الدراسية :"
        '
        'Label5
        '
        Me.Label5.AutoSize = True
        Me.Label5.Location = New System.Drawing.Point(341, 42)
        Me.Label5.Name = "Label5"
        Me.Label5.Size = New System.Drawing.Size(85, 13)
        Me.Label5.TabIndex = 34
        Me.Label5.Text = "رسوم التسجيل :"
        '
        'txtRegFees
        '
        Me.txtRegFees.Location = New System.Drawing.Point(232, 38)
        Me.txtRegFees.Name = "txtRegFees"
        Me.txtRegFees.Size = New System.Drawing.Size(103, 20)
        Me.txtRegFees.TabIndex = 3
        Me.txtRegFees.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'frmStdReg
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(641, 283)
        Me.Controls.Add(Me.GroupBox2)
        Me.Controls.Add(Me.Button3)
        Me.Controls.Add(Me.Button2)
        Me.Controls.Add(Me.Button1)
        Me.Controls.Add(Me.GroupBox4)
        Me.Controls.Add(Me.GroupBox1)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MaximizeBox = False
        Me.MaximumSize = New System.Drawing.Size(657, 321)
        Me.MinimumSize = New System.Drawing.Size(657, 321)
        Me.Name = "frmStdReg"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "إنشاء ملف طالب / طالبة"
        Me.GroupBox1.ResumeLayout(False)
        Me.GroupBox1.PerformLayout()
        CType(Me.ErrProvider, System.ComponentModel.ISupportInitialize).EndInit()
        Me.GroupBox2.ResumeLayout(False)
        Me.GroupBox2.PerformLayout()
        Me.ResumeLayout(False)

    End Sub
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents CombCollege As System.Windows.Forms.ComboBox
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents Label3 As System.Windows.Forms.Label
    Friend WithEvents txtAdderess As System.Windows.Forms.TextBox
    Friend WithEvents Label6 As System.Windows.Forms.Label
    Friend WithEvents txtTele As System.Windows.Forms.TextBox
    Friend WithEvents Label11 As System.Windows.Forms.Label
    Friend WithEvents GroupBox4 As System.Windows.Forms.GroupBox
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents Button2 As System.Windows.Forms.Button
    Friend WithEvents CombBatch As System.Windows.Forms.ComboBox
    Friend WithEvents Label13 As System.Windows.Forms.Label
    Friend WithEvents txtName As System.Windows.Forms.TextBox
    Friend WithEvents Button3 As System.Windows.Forms.Button
    Friend WithEvents ErrProvider As System.Windows.Forms.ErrorProvider
    Friend WithEvents GroupBox2 As System.Windows.Forms.GroupBox
    Friend WithEvents Label9 As System.Windows.Forms.Label
    Friend WithEvents txtDiscDescr As System.Windows.Forms.TextBox
    Friend WithEvents Label8 As System.Windows.Forms.Label
    Friend WithEvents txtTuitionFees As System.Windows.Forms.TextBox
    Friend WithEvents btnDept As System.Windows.Forms.Button
    Friend WithEvents txtDiscountPerc As System.Windows.Forms.TextBox
    Friend WithEvents CombAcdYear As System.Windows.Forms.ComboBox
    Friend WithEvents Label7 As System.Windows.Forms.Label
    Friend WithEvents Label2 As System.Windows.Forms.Label
    Friend WithEvents Label4 As System.Windows.Forms.Label
    Friend WithEvents Label5 As System.Windows.Forms.Label
    Friend WithEvents txtRegFees As System.Windows.Forms.TextBox
    Friend WithEvents txtFixedFees As System.Windows.Forms.TextBox
    Friend WithEvents Label10 As System.Windows.Forms.Label
End Class
