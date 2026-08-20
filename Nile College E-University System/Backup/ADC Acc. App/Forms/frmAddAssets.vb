Imports System.Data.SqlClient

Public Class frmAddAssets
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
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents Button2 As System.Windows.Forms.Button
    Friend WithEvents GroupBox2 As System.Windows.Forms.GroupBox
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents txtAsstName As System.Windows.Forms.TextBox
    Friend WithEvents Label2 As System.Windows.Forms.Label
    Friend WithEvents txtAsstDest1 As System.Windows.Forms.TextBox
    Friend WithEvents txtAsstDest2 As System.Windows.Forms.TextBox
    Friend WithEvents Label3 As System.Windows.Forms.Label
    Friend WithEvents GroupBox3 As System.Windows.Forms.GroupBox
    Friend WithEvents ListSubItems As System.Windows.Forms.ListBox
    Friend WithEvents GroupBox4 As System.Windows.Forms.GroupBox
    <System.Diagnostics.DebuggerStepThrough()> Private Sub InitializeComponent()
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmAddAssets))
        Me.Button1 = New System.Windows.Forms.Button
        Me.Button2 = New System.Windows.Forms.Button
        Me.GroupBox4 = New System.Windows.Forms.GroupBox
        Me.GroupBox2 = New System.Windows.Forms.GroupBox
        Me.Label2 = New System.Windows.Forms.Label
        Me.Label1 = New System.Windows.Forms.Label
        Me.txtAsstDest1 = New System.Windows.Forms.TextBox
        Me.txtAsstName = New System.Windows.Forms.TextBox
        Me.txtAsstDest2 = New System.Windows.Forms.TextBox
        Me.Label3 = New System.Windows.Forms.Label
        Me.GroupBox3 = New System.Windows.Forms.GroupBox
        Me.ListSubItems = New System.Windows.Forms.ListBox
        Me.GroupBox2.SuspendLayout()
        Me.GroupBox3.SuspendLayout()
        Me.SuspendLayout()
        '
        'Button1
        '
        Me.Button1.Location = New System.Drawing.Point(384, 153)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 32)
        Me.Button1.TabIndex = 2
        Me.Button1.Text = "Õ›Ÿ"
        '
        'Button2
        '
        Me.Button2.Location = New System.Drawing.Point(263, 153)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(75, 32)
        Me.Button2.TabIndex = 3
        Me.Button2.Text = "≈€·«ﬁ"
        '
        'GroupBox4
        '
        Me.GroupBox4.Location = New System.Drawing.Point(202, 143)
        Me.GroupBox4.Name = "GroupBox4"
        Me.GroupBox4.Size = New System.Drawing.Size(318, 4)
        Me.GroupBox4.TabIndex = 6
        Me.GroupBox4.TabStop = False
        '
        'GroupBox2
        '
        Me.GroupBox2.Controls.Add(Me.Label2)
        Me.GroupBox2.Controls.Add(Me.Label1)
        Me.GroupBox2.Controls.Add(Me.txtAsstDest1)
        Me.GroupBox2.Controls.Add(Me.txtAsstName)
        Me.GroupBox2.Location = New System.Drawing.Point(202, 4)
        Me.GroupBox2.Name = "GroupBox2"
        Me.GroupBox2.Size = New System.Drawing.Size(318, 79)
        Me.GroupBox2.TabIndex = 0
        Me.GroupBox2.TabStop = False
        Me.GroupBox2.Text = "√’Ê· À«» …"
        '
        'Label2
        '
        Me.Label2.AutoSize = True
        Me.Label2.Location = New System.Drawing.Point(240, 51)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(71, 13)
        Me.Label2.TabIndex = 1
        Me.Label2.Text = "≈Â·«ﬂ «·√’· :"
        Me.Label2.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label1
        '
        Me.Label1.AutoSize = True
        Me.Label1.Location = New System.Drawing.Point(239, 20)
        Me.Label1.Name = "Label1"
        Me.Label1.Size = New System.Drawing.Size(66, 13)
        Me.Label1.TabIndex = 0
        Me.Label1.Text = "«”„ «·√’· :"
        Me.Label1.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'txtAsstDest1
        '
        Me.txtAsstDest1.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAsstDest1.Location = New System.Drawing.Point(8, 49)
        Me.txtAsstDest1.Name = "txtAsstDest1"
        Me.txtAsstDest1.ReadOnly = True
        Me.txtAsstDest1.Size = New System.Drawing.Size(228, 20)
        Me.txtAsstDest1.TabIndex = 3
        '
        'txtAsstName
        '
        Me.txtAsstName.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAsstName.Location = New System.Drawing.Point(8, 18)
        Me.txtAsstName.Name = "txtAsstName"
        Me.txtAsstName.Size = New System.Drawing.Size(228, 20)
        Me.txtAsstName.TabIndex = 2
        '
        'txtAsstDest2
        '
        Me.txtAsstDest2.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAsstDest2.Location = New System.Drawing.Point(8, 16)
        Me.txtAsstDest2.Name = "txtAsstDest2"
        Me.txtAsstDest2.ReadOnly = True
        Me.txtAsstDest2.Size = New System.Drawing.Size(228, 20)
        Me.txtAsstDest2.TabIndex = 0
        '
        'Label3
        '
        Me.Label3.AutoSize = True
        Me.Label3.Location = New System.Drawing.Point(242, 18)
        Me.Label3.Name = "Label3"
        Me.Label3.Size = New System.Drawing.Size(71, 13)
        Me.Label3.TabIndex = 2
        Me.Label3.Text = "≈Â·«ﬂ «·√’· :"
        Me.Label3.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'GroupBox3
        '
        Me.GroupBox3.Controls.Add(Me.Label3)
        Me.GroupBox3.Controls.Add(Me.txtAsstDest2)
        Me.GroupBox3.Location = New System.Drawing.Point(202, 89)
        Me.GroupBox3.Name = "GroupBox3"
        Me.GroupBox3.Size = New System.Drawing.Size(318, 48)
        Me.GroupBox3.TabIndex = 1
        Me.GroupBox3.TabStop = False
        Me.GroupBox3.Text = "„’—Ê›« "
        '
        'ListSubItems
        '
        Me.ListSubItems.FormattingEnabled = True
        Me.ListSubItems.Location = New System.Drawing.Point(5, 5)
        Me.ListSubItems.Name = "ListSubItems"
        Me.ListSubItems.Size = New System.Drawing.Size(189, 212)
        Me.ListSubItems.TabIndex = 2
        '
        'frmAddAssets
        '
        Me.AutoScaleBaseSize = New System.Drawing.Size(5, 13)
        Me.ClientSize = New System.Drawing.Size(527, 222)
        Me.Controls.Add(Me.ListSubItems)
        Me.Controls.Add(Me.GroupBox3)
        Me.Controls.Add(Me.GroupBox4)
        Me.Controls.Add(Me.GroupBox2)
        Me.Controls.Add(Me.Button2)
        Me.Controls.Add(Me.Button1)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MaximizeBox = False
        Me.MaximumSize = New System.Drawing.Size(535, 256)
        Me.MinimumSize = New System.Drawing.Size(535, 256)
        Me.Name = "frmAddAssets"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.SizeGripStyle = System.Windows.Forms.SizeGripStyle.Hide
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "≈÷«›… «·√’Ê· «·À«» …"
        Me.GroupBox2.ResumeLayout(False)
        Me.GroupBox2.PerformLayout()
        Me.GroupBox3.ResumeLayout(False)
        Me.GroupBox3.PerformLayout()
        Me.ResumeLayout(False)

    End Sub

#End Region

    Sub Clear()
        Me.txtAsstName.Clear()
        Me.txtAsstDest1.Clear()
        Me.txtAsstDest2.Clear()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.Close()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        If Len(Me.txtAsstDest1.Text) = 0 Or Len(Me.txtAsstDest2.Text) = 0 Or Len(Me.txtAsstName.Text) = 0 Then
            MsgBox("«·—Ã«¡ „—«Ã⁄… «·»Ì«‰« ")
        Else
            Try
                Dim cmd As New SqlCommand("Insert Into Acc (Pack,Acc,SubAcc) Values " & _
                                      "(N'«·√’Ê· «·À«» …',N'«·√’Ê·',N'" & Me.txtAsstName.Text.Trim & "')", cnn)

                Dim cmd1 As New SqlCommand("Insert Into Acc (Pack,Acc,SubAcc) Values " & _
                                      "(N'«·√’Ê· «·À«» …',N'„Ã„⁄ «·≈Â·«ﬂ',N'„Ã„⁄ ≈Â·«ﬂ " & Me.txtAsstName.Text.Trim & "')", cnn)

                Dim cmd2 As New SqlCommand("Insert into Acc (Pack,Acc,SubAcc) Values (N'«·√—»«Õ Ê«·Œ”«∆—'," & _
                                      "N'«·„’—Ê›« ',N'≈Â·«ﬂ " & Me.txtAsstName.Text.Trim & "')", cnn)

                cnn.Open()
                cmd.ExecuteNonQuery()
                cmd1.ExecuteNonQuery()
                cmd2.ExecuteNonQuery()
                cnn.Close()

                MsgBox(" „ «·Õ›Ÿ")

                'Restore defaults
                Clear()
                FillAssets()
            Catch ex As Exception
                MsgBox(ex.ToString)
                Try
                    cnn.Close()
                Catch

                End Try
            End Try

        End If
    End Sub

    Private Sub FillAssets()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim Cmd As New SqlCommand("Select Distinct SubAcc From Acc Where Pack=N'«·√’Ê· «·À«» …' " & _
                                      "and Acc=N'«·√’Ê·' order by SubAcc", cnn)
            Dim Reader As SqlDataReader

            Me.ListSubItems.Items.Clear()

            cnn.Open()
            Reader = Cmd.ExecuteReader
            While Reader.Read
                Me.ListSubItems.Items.Add(Reader.Item(0))
            End While
            cnn.Close()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            MsgBox(ex.ToString)
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
        End Try
    End Sub

    Private Sub txtAsstName_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtAsstName.TextChanged
        Me.txtAsstDest1.Text = "„Ã„⁄ ≈Â·«ﬂ " + Me.txtAsstName.Text
        Me.txtAsstDest2.Text = "≈Â·«ﬂ " + Me.txtAsstName.Text
    End Sub

    Private Sub frmAddAssets_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillAssets()
    End Sub
End Class
