<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frmTransferStudent
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
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmTransferStudent))
        Me.GroupBox1 = New System.Windows.Forms.GroupBox()
        Me.txtAcdYear = New System.Windows.Forms.TextBox()
        Me.Label7 = New System.Windows.Forms.Label()
        Me.txtRegsFees = New System.Windows.Forms.TextBox()
        Me.Label2 = New System.Windows.Forms.Label()
        Me.txtProgram = New System.Windows.Forms.TextBox()
        Me.txtStdFees = New System.Windows.Forms.TextBox()
        Me.Label5 = New System.Windows.Forms.Label()
        Me.Button4 = New System.Windows.Forms.Button()
        Me.txtStdName = New System.Windows.Forms.TextBox()
        Me.Label13 = New System.Windows.Forms.Label()
        Me.txtStdIndex = New System.Windows.Forms.TextBox()
        Me.Label14 = New System.Windows.Forms.Label()
        Me.Label1 = New System.Windows.Forms.Label()
        Me.GroupBox2 = New System.Windows.Forms.GroupBox()
        Me.CombAcdYear = New System.Windows.Forms.ComboBox()
        Me.Label6 = New System.Windows.Forms.Label()
        Me.CombProgram = New System.Windows.Forms.ComboBox()
        Me.txtRegsfees1 = New System.Windows.Forms.TextBox()
        Me.Label3 = New System.Windows.Forms.Label()
        Me.txtTuitionfees1 = New System.Windows.Forms.TextBox()
        Me.Label4 = New System.Windows.Forms.Label()
        Me.Label8 = New System.Windows.Forms.Label()
        Me.GroupBox3 = New System.Windows.Forms.GroupBox()
        Me.Button2 = New System.Windows.Forms.Button()
        Me.Button1 = New System.Windows.Forms.Button()
        Me.ErrProvider = New System.Windows.Forms.ErrorProvider(Me.components)
        Me.GroupBox1.SuspendLayout()
        Me.GroupBox2.SuspendLayout()
        CType(Me.ErrProvider, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.SuspendLayout()
        '
        'GroupBox1
        '
        Me.GroupBox1.Controls.Add(Me.txtAcdYear)
        Me.GroupBox1.Controls.Add(Me.Label7)
        Me.GroupBox1.Controls.Add(Me.txtRegsFees)
        Me.GroupBox1.Controls.Add(Me.Label2)
        Me.GroupBox1.Controls.Add(Me.txtProgram)
        Me.GroupBox1.Controls.Add(Me.txtStdFees)
        Me.GroupBox1.Controls.Add(Me.Label5)
        Me.GroupBox1.Controls.Add(Me.Button4)
        Me.GroupBox1.Controls.Add(Me.txtStdName)
        Me.GroupBox1.Controls.Add(Me.Label13)
        Me.GroupBox1.Controls.Add(Me.txtStdIndex)
        Me.GroupBox1.Controls.Add(Me.Label14)
        Me.GroupBox1.Controls.Add(Me.Label1)
        Me.GroupBox1.Location = New System.Drawing.Point(11, 10)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(606, 103)
        Me.GroupBox1.TabIndex = 1
        Me.GroupBox1.TabStop = False
        Me.GroupBox1.Text = "بيانات الطالب"
        '
        'txtAcdYear
        '
        Me.txtAcdYear.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAcdYear.Location = New System.Drawing.Point(375, 76)
        Me.txtAcdYear.Name = "txtAcdYear"
        Me.txtAcdYear.ReadOnly = True
        Me.txtAcdYear.Size = New System.Drawing.Size(175, 20)
        Me.txtAcdYear.TabIndex = 44
        Me.txtAcdYear.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label7
        '
        Me.Label7.AutoSize = True
        Me.Label7.Location = New System.Drawing.Point(557, 78)
        Me.Label7.Name = "Label7"
        Me.Label7.Size = New System.Drawing.Size(36, 13)
        Me.Label7.TabIndex = 43
        Me.Label7.Text = "العام :"
        '
        'txtRegsFees
        '
        Me.txtRegsFees.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtRegsFees.Location = New System.Drawing.Point(20, 45)
        Me.txtRegsFees.Name = "txtRegsFees"
        Me.txtRegsFees.ReadOnly = True
        Me.txtRegsFees.Size = New System.Drawing.Size(72, 20)
        Me.txtRegsFees.TabIndex = 38
        Me.txtRegsFees.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label2
        '
        Me.Label2.AutoSize = True
        Me.Label2.Location = New System.Drawing.Point(95, 49)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(85, 13)
        Me.Label2.TabIndex = 39
        Me.Label2.Text = "رسوم التسجيل :"
        '
        'txtProgram
        '
        Me.txtProgram.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtProgram.Location = New System.Drawing.Point(375, 45)
        Me.txtProgram.Name = "txtProgram"
        Me.txtProgram.ReadOnly = True
        Me.txtProgram.Size = New System.Drawing.Size(175, 20)
        Me.txtProgram.TabIndex = 37
        Me.txtProgram.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'txtStdFees
        '
        Me.txtStdFees.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtStdFees.Location = New System.Drawing.Point(190, 45)
        Me.txtStdFees.Name = "txtStdFees"
        Me.txtStdFees.ReadOnly = True
        Me.txtStdFees.Size = New System.Drawing.Size(72, 20)
        Me.txtStdFees.TabIndex = 3
        Me.txtStdFees.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label5
        '
        Me.Label5.AutoSize = True
        Me.Label5.Location = New System.Drawing.Point(265, 49)
        Me.Label5.Name = "Label5"
        Me.Label5.Size = New System.Drawing.Size(91, 13)
        Me.Label5.TabIndex = 36
        Me.Label5.Text = "الرسوم الدراسية :"
        '
        'Button4
        '
        Me.Button4.Location = New System.Drawing.Point(375, 14)
        Me.Button4.Name = "Button4"
        Me.Button4.Size = New System.Drawing.Size(30, 24)
        Me.Button4.TabIndex = 2
        Me.Button4.Text = "...."
        Me.Button4.UseVisualStyleBackColor = True
        '
        'txtStdName
        '
        Me.txtStdName.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtStdName.Location = New System.Drawing.Point(20, 16)
        Me.txtStdName.Name = "txtStdName"
        Me.txtStdName.ReadOnly = True
        Me.txtStdName.Size = New System.Drawing.Size(293, 20)
        Me.txtStdName.TabIndex = 1
        '
        'Label13
        '
        Me.Label13.AutoSize = True
        Me.Label13.Location = New System.Drawing.Point(320, 20)
        Me.Label13.Name = "Label13"
        Me.Label13.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label13.Size = New System.Drawing.Size(43, 13)
        Me.Label13.TabIndex = 0
        Me.Label13.Text = "الإسم :"
        '
        'txtStdIndex
        '
        Me.txtStdIndex.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtStdIndex.Location = New System.Drawing.Point(411, 16)
        Me.txtStdIndex.Name = "txtStdIndex"
        Me.txtStdIndex.Size = New System.Drawing.Size(139, 20)
        Me.txtStdIndex.TabIndex = 1
        Me.txtStdIndex.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label14
        '
        Me.Label14.AutoSize = True
        Me.Label14.Location = New System.Drawing.Point(556, 20)
        Me.Label14.Name = "Label14"
        Me.Label14.Size = New System.Drawing.Size(38, 13)
        Me.Label14.TabIndex = 24
        Me.Label14.Text = "الرقم :"
        Me.Label14.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label1
        '
        Me.Label1.AutoSize = True
        Me.Label1.Location = New System.Drawing.Point(556, 48)
        Me.Label1.Name = "Label1"
        Me.Label1.Size = New System.Drawing.Size(49, 13)
        Me.Label1.TabIndex = 2
        Me.Label1.Text = "البرنامج :"
        '
        'GroupBox2
        '
        Me.GroupBox2.Controls.Add(Me.CombAcdYear)
        Me.GroupBox2.Controls.Add(Me.Label6)
        Me.GroupBox2.Controls.Add(Me.CombProgram)
        Me.GroupBox2.Controls.Add(Me.txtRegsfees1)
        Me.GroupBox2.Controls.Add(Me.Label3)
        Me.GroupBox2.Controls.Add(Me.txtTuitionfees1)
        Me.GroupBox2.Controls.Add(Me.Label4)
        Me.GroupBox2.Controls.Add(Me.Label8)
        Me.GroupBox2.Location = New System.Drawing.Point(12, 119)
        Me.GroupBox2.Name = "GroupBox2"
        Me.GroupBox2.Size = New System.Drawing.Size(606, 81)
        Me.GroupBox2.TabIndex = 0
        Me.GroupBox2.TabStop = False
        Me.GroupBox2.Text = "تحويل الى"
        '
        'CombAcdYear
        '
        Me.CombAcdYear.AutoCompleteCustomSource.AddRange(New String() {""})
        Me.CombAcdYear.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombAcdYear.ForeColor = System.Drawing.SystemColors.WindowText
        Me.CombAcdYear.FormattingEnabled = True
        Me.CombAcdYear.Items.AddRange(New Object() {"الفصل الدراسي الأول", "الفصل الدراسي الثاني"})
        Me.CombAcdYear.Location = New System.Drawing.Point(374, 49)
        Me.CombAcdYear.Name = "CombAcdYear"
        Me.CombAcdYear.Size = New System.Drawing.Size(175, 21)
        Me.CombAcdYear.TabIndex = 42
        '
        'Label6
        '
        Me.Label6.AutoSize = True
        Me.Label6.Location = New System.Drawing.Point(556, 51)
        Me.Label6.Name = "Label6"
        Me.Label6.Size = New System.Drawing.Size(36, 13)
        Me.Label6.TabIndex = 41
        Me.Label6.Text = "العام :"
        '
        'CombProgram
        '
        Me.CombProgram.AutoCompleteCustomSource.AddRange(New String() {""})
        Me.CombProgram.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombProgram.ForeColor = System.Drawing.SystemColors.WindowText
        Me.CombProgram.FormattingEnabled = True
        Me.CombProgram.Items.AddRange(New Object() {"الفصل الدراسي الأول", "الفصل الدراسي الثاني"})
        Me.CombProgram.Location = New System.Drawing.Point(374, 22)
        Me.CombProgram.Name = "CombProgram"
        Me.CombProgram.Size = New System.Drawing.Size(175, 21)
        Me.CombProgram.TabIndex = 2
        '
        'txtRegsfees1
        '
        Me.txtRegsfees1.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtRegsfees1.Location = New System.Drawing.Point(20, 21)
        Me.txtRegsfees1.Name = "txtRegsfees1"
        Me.txtRegsfees1.Size = New System.Drawing.Size(72, 20)
        Me.txtRegsfees1.TabIndex = 4
        Me.txtRegsfees1.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label3
        '
        Me.Label3.AutoSize = True
        Me.Label3.Location = New System.Drawing.Point(95, 25)
        Me.Label3.Name = "Label3"
        Me.Label3.Size = New System.Drawing.Size(85, 13)
        Me.Label3.TabIndex = 39
        Me.Label3.Text = "رسوم التسجيل :"
        '
        'txtTuitionfees1
        '
        Me.txtTuitionfees1.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtTuitionfees1.Location = New System.Drawing.Point(190, 21)
        Me.txtTuitionfees1.Name = "txtTuitionfees1"
        Me.txtTuitionfees1.Size = New System.Drawing.Size(72, 20)
        Me.txtTuitionfees1.TabIndex = 3
        Me.txtTuitionfees1.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label4
        '
        Me.Label4.AutoSize = True
        Me.Label4.Location = New System.Drawing.Point(265, 25)
        Me.Label4.Name = "Label4"
        Me.Label4.Size = New System.Drawing.Size(91, 13)
        Me.Label4.TabIndex = 36
        Me.Label4.Text = "الرسوم الدراسية :"
        '
        'Label8
        '
        Me.Label8.AutoSize = True
        Me.Label8.Location = New System.Drawing.Point(556, 24)
        Me.Label8.Name = "Label8"
        Me.Label8.Size = New System.Drawing.Size(49, 13)
        Me.Label8.TabIndex = 2
        Me.Label8.Text = "البرنامج :"
        '
        'GroupBox3
        '
        Me.GroupBox3.Location = New System.Drawing.Point(11, 203)
        Me.GroupBox3.Name = "GroupBox3"
        Me.GroupBox3.Size = New System.Drawing.Size(607, 3)
        Me.GroupBox3.TabIndex = 41
        Me.GroupBox3.TabStop = False
        '
        'Button2
        '
        Me.Button2.Location = New System.Drawing.Point(106, 212)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(75, 31)
        Me.Button2.TabIndex = 4
        Me.Button2.Text = "تحويل"
        Me.Button2.UseVisualStyleBackColor = True
        '
        'Button1
        '
        Me.Button1.Location = New System.Drawing.Point(12, 212)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 31)
        Me.Button1.TabIndex = 2
        Me.Button1.Text = "خروج"
        Me.Button1.UseVisualStyleBackColor = True
        '
        'ErrProvider
        '
        Me.ErrProvider.ContainerControl = Me
        '
        'frmTransferStudent
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(620, 252)
        Me.Controls.Add(Me.Button2)
        Me.Controls.Add(Me.Button1)
        Me.Controls.Add(Me.GroupBox3)
        Me.Controls.Add(Me.GroupBox2)
        Me.Controls.Add(Me.GroupBox1)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MaximizeBox = False
        Me.Name = "frmTransferStudent"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "تحويل طالب/طالبة"
        Me.GroupBox1.ResumeLayout(False)
        Me.GroupBox1.PerformLayout()
        Me.GroupBox2.ResumeLayout(False)
        Me.GroupBox2.PerformLayout()
        CType(Me.ErrProvider, System.ComponentModel.ISupportInitialize).EndInit()
        Me.ResumeLayout(False)

    End Sub
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents txtRegsFees As System.Windows.Forms.TextBox
    Friend WithEvents Label2 As System.Windows.Forms.Label
    Friend WithEvents txtProgram As System.Windows.Forms.TextBox
    Friend WithEvents txtStdFees As System.Windows.Forms.TextBox
    Friend WithEvents Label5 As System.Windows.Forms.Label
    Friend WithEvents Button4 As System.Windows.Forms.Button
    Friend WithEvents txtStdName As System.Windows.Forms.TextBox
    Friend WithEvents Label13 As System.Windows.Forms.Label
    Friend WithEvents txtStdIndex As System.Windows.Forms.TextBox
    Friend WithEvents Label14 As System.Windows.Forms.Label
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents GroupBox2 As System.Windows.Forms.GroupBox
    Friend WithEvents txtRegsfees1 As System.Windows.Forms.TextBox
    Friend WithEvents Label3 As System.Windows.Forms.Label
    Friend WithEvents txtTuitionfees1 As System.Windows.Forms.TextBox
    Friend WithEvents Label4 As System.Windows.Forms.Label
    Friend WithEvents Label8 As System.Windows.Forms.Label
    Friend WithEvents CombProgram As System.Windows.Forms.ComboBox
    Friend WithEvents GroupBox3 As System.Windows.Forms.GroupBox
    Friend WithEvents Button2 As System.Windows.Forms.Button
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents ErrProvider As System.Windows.Forms.ErrorProvider
    Friend WithEvents CombAcdYear As System.Windows.Forms.ComboBox
    Friend WithEvents Label6 As System.Windows.Forms.Label
    Friend WithEvents txtAcdYear As System.Windows.Forms.TextBox
    Friend WithEvents Label7 As System.Windows.Forms.Label
End Class
