Imports System.Data.SqlClient

Public Class frmChangePassword
    Inherits System.Windows.Forms.Form

#Region " Windows Form Designer generated code "

    Public Sub New()
        MyBase.New()

        'This call is required by the Windows Form Designer.
        InitializeComponent()

        'Add any initialization after the InitializeComponent() call

    End Sub

    'Form overrides dispose to clean up the component list.
    Protected Overloads Overrides Sub Dispose(ByVal disposing As Boolean)
        If disposing Then
            If Not (components Is Nothing) Then
                components.Dispose()
            End If
        End If
        MyBase.Dispose(disposing)
    End Sub

    'Required by the Windows Form Designer
    Private components As System.ComponentModel.IContainer

    'NOTE: The following procedure is required by the Windows Form Designer
    'It can be modified using the Windows Form Designer.  
    'Do not modify it using the code editor.
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents Label2 As System.Windows.Forms.Label
    Friend WithEvents Label3 As System.Windows.Forms.Label
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents Button2 As System.Windows.Forms.Button
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents GroupBox2 As System.Windows.Forms.GroupBox
    Friend WithEvents txtOldPWD As System.Windows.Forms.TextBox
    Friend WithEvents txtNewPwd1 As System.Windows.Forms.TextBox
    Friend WithEvents txtNewPwd2 As System.Windows.Forms.TextBox
    <System.Diagnostics.DebuggerStepThrough()> Private Sub InitializeComponent()
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmChangePassword))
        Me.Label1 = New System.Windows.Forms.Label
        Me.Label2 = New System.Windows.Forms.Label
        Me.Label3 = New System.Windows.Forms.Label
        Me.txtOldPWD = New System.Windows.Forms.TextBox
        Me.txtNewPwd1 = New System.Windows.Forms.TextBox
        Me.txtNewPwd2 = New System.Windows.Forms.TextBox
        Me.Button1 = New System.Windows.Forms.Button
        Me.Button2 = New System.Windows.Forms.Button
        Me.GroupBox1 = New System.Windows.Forms.GroupBox
        Me.GroupBox2 = New System.Windows.Forms.GroupBox
        Me.GroupBox1.SuspendLayout()
        Me.SuspendLayout()
        '
        'Label1
        '
        Me.Label1.AutoSize = True
        Me.Label1.Location = New System.Drawing.Point(284, 19)
        Me.Label1.Name = "Label1"
        Me.Label1.Size = New System.Drawing.Size(80, 13)
        Me.Label1.TabIndex = 0
        Me.Label1.Text = "«·ﬂ·„… «·ﬁœÌ„… :"
        Me.Label1.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label2
        '
        Me.Label2.AutoSize = True
        Me.Label2.Location = New System.Drawing.Point(108, 51)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(71, 13)
        Me.Label2.TabIndex = 1
        Me.Label2.Text = " ﬂ—«— «·ÃœÌœ… :"
        Me.Label2.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label3
        '
        Me.Label3.AutoSize = True
        Me.Label3.Location = New System.Drawing.Point(108, 19)
        Me.Label3.Name = "Label3"
        Me.Label3.Size = New System.Drawing.Size(47, 13)
        Me.Label3.TabIndex = 2
        Me.Label3.Text = "«·ÃœÌœ… :"
        Me.Label3.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'txtOldPWD
        '
        Me.txtOldPWD.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtOldPWD.Location = New System.Drawing.Point(182, 15)
        Me.txtOldPWD.Name = "txtOldPWD"
        Me.txtOldPWD.PasswordChar = Global.Microsoft.VisualBasic.ChrW(42)
        Me.txtOldPWD.Size = New System.Drawing.Size(100, 20)
        Me.txtOldPWD.TabIndex = 0
        '
        'txtNewPwd1
        '
        Me.txtNewPwd1.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtNewPwd1.Location = New System.Drawing.Point(6, 15)
        Me.txtNewPwd1.Name = "txtNewPwd1"
        Me.txtNewPwd1.PasswordChar = Global.Microsoft.VisualBasic.ChrW(42)
        Me.txtNewPwd1.Size = New System.Drawing.Size(100, 20)
        Me.txtNewPwd1.TabIndex = 1
        '
        'txtNewPwd2
        '
        Me.txtNewPwd2.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtNewPwd2.Location = New System.Drawing.Point(6, 47)
        Me.txtNewPwd2.Name = "txtNewPwd2"
        Me.txtNewPwd2.PasswordChar = Global.Microsoft.VisualBasic.ChrW(42)
        Me.txtNewPwd2.Size = New System.Drawing.Size(100, 20)
        Me.txtNewPwd2.TabIndex = 2
        '
        'Button1
        '
        Me.Button1.Location = New System.Drawing.Point(224, 94)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 32)
        Me.Button1.TabIndex = 1
        Me.Button1.Text = "Õ›Ÿ"
        '
        'Button2
        '
        Me.Button2.Location = New System.Drawing.Point(79, 94)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(75, 32)
        Me.Button2.TabIndex = 2
        Me.Button2.Text = "≈€·«ﬁ"
        '
        'GroupBox1
        '
        Me.GroupBox1.Controls.Add(Me.txtNewPwd2)
        Me.GroupBox1.Controls.Add(Me.Label1)
        Me.GroupBox1.Controls.Add(Me.txtNewPwd1)
        Me.GroupBox1.Controls.Add(Me.txtOldPWD)
        Me.GroupBox1.Controls.Add(Me.Label2)
        Me.GroupBox1.Controls.Add(Me.Label3)
        Me.GroupBox1.Location = New System.Drawing.Point(7, 0)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(365, 78)
        Me.GroupBox1.TabIndex = 0
        Me.GroupBox1.TabStop = False
        '
        'GroupBox2
        '
        Me.GroupBox2.Location = New System.Drawing.Point(7, 80)
        Me.GroupBox2.Name = "GroupBox2"
        Me.GroupBox2.Size = New System.Drawing.Size(365, 8)
        Me.GroupBox2.TabIndex = 6
        Me.GroupBox2.TabStop = False
        '
        'frmChangePWD
        '
        Me.AutoScaleBaseSize = New System.Drawing.Size(5, 13)
        Me.ClientSize = New System.Drawing.Size(379, 132)
        Me.Controls.Add(Me.GroupBox1)
        Me.Controls.Add(Me.Button2)
        Me.Controls.Add(Me.Button1)
        Me.Controls.Add(Me.GroupBox2)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MaximizeBox = False
        Me.MaximumSize = New System.Drawing.Size(387, 166)
        Me.MinimumSize = New System.Drawing.Size(387, 166)
        Me.Name = "frmChangePWD"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.SizeGripStyle = System.Windows.Forms.SizeGripStyle.Hide
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = " €ÌÌ— ﬂ·„… «·”—"
        Me.GroupBox1.ResumeLayout(False)
        Me.GroupBox1.PerformLayout()
        Me.ResumeLayout(False)

    End Sub

#End Region

    Sub Clear()
        Me.txtNewPwd1.Clear()
        Me.txtNewPwd2.Clear()
        Me.txtOldPWD.Clear()
        Me.txtOldPWD.Focus()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.Close()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Try
            If CStr(Me.txtOldPWD.Text) = PWD And CStr(Me.txtNewPwd1.Text) = CStr(Me.txtNewPwd2.Text) Then
                Dim cmd As New SqlCommand("Update Users set Pass=N'" & Me.txtNewPwd1.Text.Trim & _
                                          "' Where SNo=N'" & CurrentUserID & "'", cnnSecurity)
                cnnSecurity.Open()
                cmd.ExecuteNonQuery()
                cnnSecurity.Close()

                MsgBox("      „ «·Õ›Ÿ")
                PWD = Me.txtNewPwd1.Text.Trim
                Clear()
            Else
                MsgBox("«·—Ã«¡ „—«Ã⁄… «·»Ì«‰« ")
                Clear()
            End If
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            MsgBox(ex.ToString)
            If cnnSecurity.State = ConnectionState.Open Then
                cnnSecurity.Close()
            End If
        End Try
    End Sub

    Private Sub frmChangePWD_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Clear()
    End Sub
End Class
