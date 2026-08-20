<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frmRptStudentsUnpaidList
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
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmRptStudentsUnpaidList))
        Me.CombCollege = New System.Windows.Forms.ComboBox
        Me.Button2 = New System.Windows.Forms.Button
        Me.GroupBox4 = New System.Windows.Forms.GroupBox
        Me.GroupBox1 = New System.Windows.Forms.GroupBox
        Me.CombBatch = New System.Windows.Forms.ComboBox
        Me.Label13 = New System.Windows.Forms.Label
        Me.Label2 = New System.Windows.Forms.Label
        Me.Label1 = New System.Windows.Forms.Label
        Me.DateTimePicker1 = New System.Windows.Forms.DateTimePicker
        Me.Button1 = New System.Windows.Forms.Button
        Me.GroupBox1.SuspendLayout()
        Me.SuspendLayout()
        '
        'CombCollege
        '
        Me.CombCollege.AutoCompleteCustomSource.AddRange(New String() {""})
        Me.CombCollege.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombCollege.ForeColor = System.Drawing.SystemColors.WindowText
        Me.CombCollege.FormattingEnabled = True
        Me.CombCollege.Location = New System.Drawing.Point(271, 18)
        Me.CombCollege.Name = "CombCollege"
        Me.CombCollege.Size = New System.Drawing.Size(200, 21)
        Me.CombCollege.TabIndex = 0
        '
        'Button2
        '
        Me.Button2.Location = New System.Drawing.Point(316, 100)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(75, 31)
        Me.Button2.TabIndex = 1
        Me.Button2.Text = "عرض"
        Me.Button2.UseVisualStyleBackColor = True
        '
        'GroupBox4
        '
        Me.GroupBox4.Location = New System.Drawing.Point(7, 84)
        Me.GroupBox4.Name = "GroupBox4"
        Me.GroupBox4.Size = New System.Drawing.Size(529, 8)
        Me.GroupBox4.TabIndex = 34
        Me.GroupBox4.TabStop = False
        '
        'GroupBox1
        '
        Me.GroupBox1.Controls.Add(Me.CombBatch)
        Me.GroupBox1.Controls.Add(Me.Label13)
        Me.GroupBox1.Controls.Add(Me.Label2)
        Me.GroupBox1.Controls.Add(Me.Label1)
        Me.GroupBox1.Controls.Add(Me.CombCollege)
        Me.GroupBox1.Controls.Add(Me.DateTimePicker1)
        Me.GroupBox1.Location = New System.Drawing.Point(7, 4)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(529, 76)
        Me.GroupBox1.TabIndex = 0
        Me.GroupBox1.TabStop = False
        '
        'CombBatch
        '
        Me.CombBatch.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombBatch.FormattingEnabled = True
        Me.CombBatch.Location = New System.Drawing.Point(350, 45)
        Me.CombBatch.Name = "CombBatch"
        Me.CombBatch.Size = New System.Drawing.Size(121, 21)
        Me.CombBatch.TabIndex = 1
        '
        'Label13
        '
        Me.Label13.AutoSize = True
        Me.Label13.Location = New System.Drawing.Point(477, 49)
        Me.Label13.Name = "Label13"
        Me.Label13.Size = New System.Drawing.Size(43, 13)
        Me.Label13.TabIndex = 30
        Me.Label13.Text = "الدفعه :"
        '
        'Label2
        '
        Me.Label2.AutoSize = True
        Me.Label2.Location = New System.Drawing.Point(212, 49)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(48, 13)
        Me.Label2.TabIndex = 28
        Me.Label2.Text = "في يوم :"
        Me.Label2.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label1
        '
        Me.Label1.AutoSize = True
        Me.Label1.Location = New System.Drawing.Point(477, 22)
        Me.Label1.Name = "Label1"
        Me.Label1.Size = New System.Drawing.Size(40, 13)
        Me.Label1.TabIndex = 27
        Me.Label1.Text = "الكلية :"
        Me.Label1.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'DateTimePicker1
        '
        Me.DateTimePicker1.Location = New System.Drawing.Point(6, 45)
        Me.DateTimePicker1.Name = "DateTimePicker1"
        Me.DateTimePicker1.Size = New System.Drawing.Size(200, 20)
        Me.DateTimePicker1.TabIndex = 2
        '
        'Button1
        '
        Me.Button1.Location = New System.Drawing.Point(152, 100)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 31)
        Me.Button1.TabIndex = 2
        Me.Button1.Text = "خروج"
        Me.Button1.UseVisualStyleBackColor = True
        '
        'frmRptStudentsUnpaidList
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(543, 135)
        Me.Controls.Add(Me.Button2)
        Me.Controls.Add(Me.GroupBox4)
        Me.Controls.Add(Me.GroupBox1)
        Me.Controls.Add(Me.Button1)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MaximizeBox = False
        Me.MaximumSize = New System.Drawing.Size(551, 169)
        Me.MinimumSize = New System.Drawing.Size(551, 169)
        Me.Name = "frmRptStudentsUnpaidList"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "كشف بالطلاب المتأخرين عن السداد"
        Me.GroupBox1.ResumeLayout(False)
        Me.GroupBox1.PerformLayout()
        Me.ResumeLayout(False)

    End Sub
    Friend WithEvents CombCollege As System.Windows.Forms.ComboBox
    Friend WithEvents Button2 As System.Windows.Forms.Button
    Friend WithEvents GroupBox4 As System.Windows.Forms.GroupBox
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents DateTimePicker1 As System.Windows.Forms.DateTimePicker
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents Label2 As System.Windows.Forms.Label
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents CombBatch As System.Windows.Forms.ComboBox
    Friend WithEvents Label13 As System.Windows.Forms.Label
End Class
