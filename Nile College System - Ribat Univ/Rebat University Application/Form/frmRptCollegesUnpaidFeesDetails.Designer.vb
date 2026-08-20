<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frmRptCollegesUnpaidFeesDetails
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
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmRptCollegesUnpaidFeesDetails))
        Me.Button1 = New System.Windows.Forms.Button
        Me.GroupBox2 = New System.Windows.Forms.GroupBox
        Me.CombCollege = New System.Windows.Forms.ComboBox
        Me.RCollege = New System.Windows.Forms.RadioButton
        Me.RAll = New System.Windows.Forms.RadioButton
        Me.Button2 = New System.Windows.Forms.Button
        Me.GroupBox4 = New System.Windows.Forms.GroupBox
        Me.GroupBox1 = New System.Windows.Forms.GroupBox
        Me.DateTimePicker1 = New System.Windows.Forms.DateTimePicker
        Me.GroupBox2.SuspendLayout()
        Me.GroupBox1.SuspendLayout()
        Me.SuspendLayout()
        '
        'Button1
        '
        Me.Button1.Location = New System.Drawing.Point(141, 120)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 31)
        Me.Button1.TabIndex = 2
        Me.Button1.Text = "خروج"
        Me.Button1.UseVisualStyleBackColor = True
        '
        'GroupBox2
        '
        Me.GroupBox2.Controls.Add(Me.CombCollege)
        Me.GroupBox2.Controls.Add(Me.RCollege)
        Me.GroupBox2.Controls.Add(Me.RAll)
        Me.GroupBox2.Location = New System.Drawing.Point(8, 3)
        Me.GroupBox2.Name = "GroupBox2"
        Me.GroupBox2.Size = New System.Drawing.Size(503, 48)
        Me.GroupBox2.TabIndex = 31
        Me.GroupBox2.TabStop = False
        Me.GroupBox2.Text = "النوع"
        '
        'CombCollege
        '
        Me.CombCollege.AutoCompleteCustomSource.AddRange(New String() {""})
        Me.CombCollege.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombCollege.ForeColor = System.Drawing.SystemColors.WindowText
        Me.CombCollege.FormattingEnabled = True
        Me.CombCollege.Location = New System.Drawing.Point(11, 15)
        Me.CombCollege.Name = "CombCollege"
        Me.CombCollege.Size = New System.Drawing.Size(252, 21)
        Me.CombCollege.TabIndex = 26
        '
        'RCollege
        '
        Me.RCollege.AutoSize = True
        Me.RCollege.Location = New System.Drawing.Point(269, 17)
        Me.RCollege.Name = "RCollege"
        Me.RCollege.Size = New System.Drawing.Size(51, 17)
        Me.RCollege.TabIndex = 25
        Me.RCollege.Text = "الكلية"
        Me.RCollege.UseVisualStyleBackColor = True
        '
        'RAll
        '
        Me.RAll.AutoSize = True
        Me.RAll.Location = New System.Drawing.Point(396, 17)
        Me.RAll.Name = "RAll"
        Me.RAll.Size = New System.Drawing.Size(73, 17)
        Me.RAll.TabIndex = 24
        Me.RAll.Text = "عرض الكل"
        Me.RAll.UseVisualStyleBackColor = True
        '
        'Button2
        '
        Me.Button2.Location = New System.Drawing.Point(303, 120)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(75, 31)
        Me.Button2.TabIndex = 30
        Me.Button2.Text = "عرض"
        Me.Button2.UseVisualStyleBackColor = True
        '
        'GroupBox4
        '
        Me.GroupBox4.Location = New System.Drawing.Point(8, 106)
        Me.GroupBox4.Name = "GroupBox4"
        Me.GroupBox4.Size = New System.Drawing.Size(503, 8)
        Me.GroupBox4.TabIndex = 29
        Me.GroupBox4.TabStop = False
        '
        'GroupBox1
        '
        Me.GroupBox1.Controls.Add(Me.DateTimePicker1)
        Me.GroupBox1.Location = New System.Drawing.Point(8, 55)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(503, 48)
        Me.GroupBox1.TabIndex = 28
        Me.GroupBox1.TabStop = False
        Me.GroupBox1.Text = "في يوم"
        '
        'DateTimePicker1
        '
        Me.DateTimePicker1.Location = New System.Drawing.Point(269, 19)
        Me.DateTimePicker1.Name = "DateTimePicker1"
        Me.DateTimePicker1.Size = New System.Drawing.Size(200, 20)
        Me.DateTimePicker1.TabIndex = 12
        '
        'frmRptCollegesUnpaidFeesDetails
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(519, 158)
        Me.Controls.Add(Me.GroupBox2)
        Me.Controls.Add(Me.Button2)
        Me.Controls.Add(Me.GroupBox4)
        Me.Controls.Add(Me.GroupBox1)
        Me.Controls.Add(Me.Button1)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MaximizeBox = False
        Me.Name = "frmRptCollegesUnpaidFeesDetails"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "تفاصيل متأخرات الكليات"
        Me.GroupBox2.ResumeLayout(False)
        Me.GroupBox2.PerformLayout()
        Me.GroupBox1.ResumeLayout(False)
        Me.ResumeLayout(False)

    End Sub
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents GroupBox2 As System.Windows.Forms.GroupBox
    Friend WithEvents RCollege As System.Windows.Forms.RadioButton
    Friend WithEvents RAll As System.Windows.Forms.RadioButton
    Friend WithEvents Button2 As System.Windows.Forms.Button
    Friend WithEvents GroupBox4 As System.Windows.Forms.GroupBox
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents DateTimePicker1 As System.Windows.Forms.DateTimePicker
    Friend WithEvents CombCollege As System.Windows.Forms.ComboBox
End Class
