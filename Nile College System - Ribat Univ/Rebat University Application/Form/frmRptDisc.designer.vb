<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frmRptDisc
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
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmRptDisc))
        Me.CombCollege = New System.Windows.Forms.ComboBox
        Me.CombAcdYear = New System.Windows.Forms.ComboBox
        Me.Label7 = New System.Windows.Forms.Label
        Me.Label1 = New System.Windows.Forms.Label
        Me.GroupBox1 = New System.Windows.Forms.GroupBox
        Me.Button2 = New System.Windows.Forms.Button
        Me.Button1 = New System.Windows.Forms.Button
        Me.SuspendLayout()
        '
        'CombCollege
        '
        Me.CombCollege.FormattingEnabled = True
        Me.CombCollege.Location = New System.Drawing.Point(178, 8)
        Me.CombCollege.Name = "CombCollege"
        Me.CombCollege.Size = New System.Drawing.Size(121, 21)
        Me.CombCollege.TabIndex = 0
        '
        'CombAcdYear
        '
        Me.CombAcdYear.FormattingEnabled = True
        Me.CombAcdYear.Location = New System.Drawing.Point(10, 8)
        Me.CombAcdYear.Name = "CombAcdYear"
        Me.CombAcdYear.Size = New System.Drawing.Size(121, 21)
        Me.CombAcdYear.TabIndex = 1
        '
        'Label7
        '
        Me.Label7.AutoSize = True
        Me.Label7.Location = New System.Drawing.Point(131, 12)
        Me.Label7.Name = "Label7"
        Me.Label7.Size = New System.Drawing.Size(36, 13)
        Me.Label7.TabIndex = 30
        Me.Label7.Text = "العام :"
        Me.Label7.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label1
        '
        Me.Label1.AutoSize = True
        Me.Label1.Location = New System.Drawing.Point(304, 12)
        Me.Label1.Name = "Label1"
        Me.Label1.Size = New System.Drawing.Size(40, 13)
        Me.Label1.TabIndex = 29
        Me.Label1.Text = "الكلية :"
        '
        'GroupBox1
        '
        Me.GroupBox1.Location = New System.Drawing.Point(6, 39)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(327, 8)
        Me.GroupBox1.TabIndex = 31
        Me.GroupBox1.TabStop = False
        '
        'Button2
        '
        Me.Button2.Location = New System.Drawing.Point(198, 59)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(75, 31)
        Me.Button2.TabIndex = 32
        Me.Button2.Text = "عرض"
        Me.Button2.UseVisualStyleBackColor = True
        '
        'Button1
        '
        Me.Button1.Location = New System.Drawing.Point(68, 59)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 31)
        Me.Button1.TabIndex = 33
        Me.Button1.Text = "خروج"
        Me.Button1.UseVisualStyleBackColor = True
        '
        'frmRptDisc
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(346, 95)
        Me.Controls.Add(Me.Button2)
        Me.Controls.Add(Me.Button1)
        Me.Controls.Add(Me.GroupBox1)
        Me.Controls.Add(Me.Label7)
        Me.Controls.Add(Me.Label1)
        Me.Controls.Add(Me.CombAcdYear)
        Me.Controls.Add(Me.CombCollege)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.Name = "frmRptDisc"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "المسموحات"
        Me.ResumeLayout(False)
        Me.PerformLayout()

    End Sub
    Friend WithEvents CombCollege As System.Windows.Forms.ComboBox
    Friend WithEvents CombAcdYear As System.Windows.Forms.ComboBox
    Friend WithEvents Label7 As System.Windows.Forms.Label
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents Button2 As System.Windows.Forms.Button
    Friend WithEvents Button1 As System.Windows.Forms.Button
End Class
